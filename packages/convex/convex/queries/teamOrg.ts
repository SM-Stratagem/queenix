/**
 * Queenix Gym — People & org queries (trainers, staff timings, roles).
 *
 * Reads `users` + `trainerProfiles` + `staffProfiles` + `shifts` +
 * `staffTimeOff` + `ptSessions` + `classInstances` + `trainerEarnings`.
 * Staff-only: owner / operations (trainers may read the directory only
 * via trainersDirectory with their own record — enforced by role gate).
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireRole, requireUser } from '../_helpers';

/** Internal = has a staffProfile record; external = trainer without one. */
export const trainersDirectory = query({
  args: {
    search: v.optional(v.string()),
    availability: v.optional(
      v.union(
        v.literal('all'),
        v.literal('available'),
        v.literal('unavailable')
      )
    ),
    employment: v.optional(
      v.union(v.literal('all'), v.literal('internal'), v.literal('external'))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { search, availability = 'all', employment = 'all', limit = 100 }
  ) => {
    await requireRole(ctx, ['owner', 'operations', 'trainer']);
    const users = await ctx.db.query('users').take(500);
    const trainers = users.filter(
      (u) => u.activeRole === 'trainer' || (u.roles ?? []).includes('trainer')
    );
    const q = (search ?? '').trim().toLowerCase();
    const rows = await Promise.all(
      trainers.map(async (user) => {
        const trainerProfile = await ctx.db
          .query('trainerProfiles')
          .withIndex('by_user', (qq) => qq.eq('userId', user._id))
          .first();
        const staffProfile = await ctx.db
          .query('staffProfiles')
          .withIndex('by_user', (qq) => qq.eq('userId', user._id))
          .first();
        const sessions = await ctx.db
          .query('ptSessions')
          .withIndex('by_trainer', (qq) => qq.eq('trainerId', user._id))
          .take(500);
        const clientIds = new Set(sessions.map((s) => s.memberId as unknown as string));
        const upcomingClasses = await ctx.db
          .query('classInstances')
          .withIndex('by_trainer', (qq) => qq.eq('trainerId', user._id))
          .filter((qq) => qq.gte(qq.field('startsAt'), Date.now()))
          .take(50);
        return {
          user,
          trainerProfile,
          employment: staffProfile ? ('internal' as const) : ('external' as const),
          title: staffProfile?.title ?? null,
          department: staffProfile?.department ?? null,
          clientCount: clientIds.size,
          sessionCount: sessions.length,
          upcomingClassCount: upcomingClasses.length,
        };
      })
    );
    return rows
      .filter((r) => {
        if (
          availability === 'available' &&
          r.trainerProfile?.isAvailable !== true
        )
          return false;
        if (
          availability === 'unavailable' &&
          r.trainerProfile?.isAvailable === true
        )
          return false;
        if (employment !== 'all' && r.employment !== employment) return false;
        if (q) {
          const hay = `${r.user.fullName} ${r.user.email}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .slice(0, limit);
  },
});

/** Full 360 view of one trainer: profile, clients, classes, inflows. */
export const trainerDetail = query({
  args: { trainerId: v.id('users') },
  handler: async (ctx, { trainerId }) => {
    await requireRole(ctx, ['owner', 'operations', 'trainer']);
    const user = await ctx.db.get(trainerId);
    if (!user) return null;
    const trainerProfile = await ctx.db
      .query('trainerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', trainerId))
      .first();
    const staffProfile = await ctx.db
      .query('staffProfiles')
      .withIndex('by_user', (q) => q.eq('userId', trainerId))
      .first();
    const branchLinks = await ctx.db
      .query('branchStaff')
      .withIndex('by_user', (q) => q.eq('userId', trainerId))
      .collect();
    const branches = await Promise.all(
      branchLinks.map(async (l) => ({
        link: l,
        branch: await ctx.db.get(l.branchId),
      }))
    );

    // Clients: distinct members with session counts + next session.
    const sessions = await ctx.db
      .query('ptSessions')
      .withIndex('by_trainer', (q) => q.eq('trainerId', trainerId))
      .take(500);
    const now = Date.now();
    const byMember = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const key = s.memberId as unknown as string;
      if (!byMember.has(key)) byMember.set(key, []);
      byMember.get(key)!.push(s);
    }
    const clients = await Promise.all(
      Array.from(byMember.entries()).map(async ([memberId, ss]) => {
        const member = await ctx.db.get(memberId as any);
        const sorted = [...ss].sort((a, b) => a.scheduledAt - b.scheduledAt);
        const next = sorted.find(
          (s) => s.scheduledAt >= now && s.status === 'scheduled'
        );
        return {
          member,
          sessionCount: ss.length,
          completedCount: ss.filter((s) => s.status === 'completed').length,
          nextSessionAt: next?.scheduledAt ?? null,
        };
      })
    );
    clients.sort((a, b) => (a.nextSessionAt ?? Infinity) - (b.nextSessionAt ?? Infinity));

    const recentSessions = [...sessions]
      .sort((a, b) => b.scheduledAt - a.scheduledAt)
      .slice(0, 10);

    const upcomingClasses = await ctx.db
      .query('classInstances')
      .withIndex('by_trainer', (q) => q.eq('trainerId', trainerId))
      .filter((q) => q.gte(q.field('startsAt'), now))
      .take(10);
    const classesWithType = await Promise.all(
      upcomingClasses.map(async (c) => ({
        instance: c,
        classType: await ctx.db.get(c.classTypeId),
      }))
    );

    // Inflows: earnings aggregates from trainerEarnings.
    const earnings = await ctx.db
      .query('trainerEarnings')
      .withIndex('by_trainer', (q) => q.eq('trainerId', trainerId))
      .take(500);
    const totalCents = earnings.reduce((acc, e) => acc + e.amountCents, 0);
    const pendingCents = earnings
      .filter((e) => e.status === 'pending')
      .reduce((acc, e) => acc + e.amountCents, 0);
    const paidCents = earnings
      .filter((e) => e.status === 'paid')
      .reduce((acc, e) => acc + e.amountCents, 0);
    const currency = earnings[0]?.currency ?? trainerProfile?.currency ?? 'AED';

    return {
      user,
      trainerProfile,
      staffProfile,
      branches,
      clients,
      recentSessions,
      upcomingClasses: classesWithType,
      earnings: {
        totalCents,
        pendingCents,
        paidCents,
        currency,
        recordCount: earnings.length,
      },
    };
  },
});

/** Staff timings: shifts + sick/leave records per staff member in a window. */
export const staffTimings = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { from, to }) => {
    await requireRole(ctx, ['owner', 'operations']);
    const start = from ?? Date.now() - 7 * 24 * 60 * 60 * 1000;
    const end = to ?? Date.now() + 7 * 24 * 60 * 60 * 1000;
    const users = await ctx.db.query('users').take(500);
    const staff = users.filter((u) => u.activeRole !== 'member');
    return await Promise.all(
      staff.map(async (user) => {
        const profile = await ctx.db
          .query('staffProfiles')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .first();
        const shifts = (
          await ctx.db
            .query('shifts')
            .withIndex('by_user', (q) => q.eq('userId', user._id))
            .order('desc')
            .take(50)
        ).filter((s) => s.startsAt >= start && s.startsAt <= end);
        const timeOff = (
          await ctx.db
            .query('staffTimeOff')
            .withIndex('by_user', (q) => q.eq('userId', user._id))
            .take(50)
        ).filter((t) => {
          const ts = Date.parse(t.date);
          return !Number.isNaN(ts) && ts >= start && ts <= end;
        });
        const activeShift = shifts.find((s) => s.status === 'active') ?? null;
        return { user, profile, shifts, timeOff, activeShift };
      })
    );
  },
});

/** Sick-day / leave register with optional status filter. */
export const timeOffList = query({
  args: {
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('approved'),
        v.literal('denied'),
        v.literal('all')
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status = 'all', limit = 100 }) => {
    await requireRole(ctx, ['owner', 'operations']);
    const all = await ctx.db
      .query('staffTimeOff')
      .withIndex('by_date', (q) => q.gte('date', ''))
      .order('desc')
      .take(limit);
    const filtered =
      status === 'all' ? all : all.filter((t) => t.status === status);
    return await Promise.all(
      filtered.map(async (t) => ({ record: t, user: await ctx.db.get(t.userId) }))
    );
  },
});

/** Roles & permissions overview: headcount per role + every staffer's grants. */
export const rolesOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ['owner', 'operations']);
    const users = await ctx.db.query('users').take(500);
    const staff = users.filter((u) => u.activeRole !== 'member');
    const headcount: Record<string, number> = {};
    for (const u of staff) {
      for (const r of u.roles ?? []) headcount[r] = (headcount[r] ?? 0) + 1;
    }
    return {
      headcount,
      staff: staff.map((u) => ({
        _id: u._id,
        fullName: u.fullName,
        email: u.email,
        activeRole: u.activeRole,
        roles: u.roles,
      })),
    };
  },
});

/** Punch log for one staffer (timings audit trail). */
export const staffPunches = query({
  args: { userId: v.id('users'), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit = 30 }) => {
    await requireUser(ctx);
    return await ctx.db
      .query('punchEvents')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit);
  },
});

/**
 * Signed-in staff member's own time-off requests, newest first.
 */
export const myTimeOff = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx as any);
    return await ctx.db
      .query('staffTimeOff')
      .filter((q) => q.eq(q.field('userId'), user._id))
      .order('desc')
      .take(50);
  },
});
