/**
 * Queenix Gym — User queries
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireUser } from '../_helpers';

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query('users')
      .withIndex('by_betterAuthUserId', (q) => q.eq('betterAuthUserId', identity.subject))
      .first();
    return user;
  },
});

export const getMemberProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('memberProfiles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();
  },
});

export const getLoyaltyBalance = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const entries = await ctx.db
      .query('loyaltyLedger')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    const balance = entries.reduce((acc, e) => acc + e.points, 0);
    return { balance, entries: entries.slice(-20) };
  },
});

export const getMyReferrals = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('referrals')
      .withIndex('by_referrer', (q) => q.eq('referrerId', user._id))
      .order('desc')
      .collect();
  },
});

// ============================================================
// Trainer queries
// ============================================================

/**
 * Get all PT sessions for the current trainer scheduled today,
 * joined with member user info, ordered by scheduledAt ascending.
 */
export const getTodaySessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const sessions = await ctx.db
      .query('ptSessions')
      .withIndex('by_trainer', (q) => q.eq('trainerId', user._id))
      .filter(
        (q) =>
          q.gte(q.field('scheduledAt'), startOfDay) &
          q.lt(q.field('scheduledAt'), endOfDay)
      )
      .collect();

    const sorted = sessions.sort((a, b) => a.scheduledAt - b.scheduledAt);

    // Join with member user info
    const withMember = await Promise.all(
      sorted.map(async (s) => {
        const member = await ctx.db.get(s.memberId);
        return { ...s, member };
      })
    );

    return withMember;
  },
});

/**
 * Get the current trainer's full week schedule (PT sessions + classes
 * they are teaching) for Mon–Sun of the current week, joined with
 * member/class-type info.
 */
export const getWeekSchedule = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    // Compute Monday-Sunday window in local time
    const now = new Date();
    const day = now.getDay(); // 0=Sun..6=Sat
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    const weekStart = monday.getTime();
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;

    // PT sessions for this trainer in this window
    const ptSessions = await ctx.db
      .query('ptSessions')
      .withIndex('by_trainer', (q) => q.eq('trainerId', user._id))
      .filter(
        (q) =>
          q.gte(q.field('scheduledAt'), weekStart) &
          q.lt(q.field('scheduledAt'), weekEnd)
      )
      .collect();

    // Class instances taught by this trainer in this window
    const classInstances = await ctx.db
      .query('classInstances')
      .withIndex('by_trainer', (q) => q.eq('trainerId', user._id))
      .filter(
        (q) =>
          q.gte(q.field('startsAt'), weekStart) &
          q.lt(q.field('startsAt'), weekEnd)
      )
      .collect();

    // Join with member / classType / bookings counts
    const ptWithMember = await Promise.all(
      ptSessions.map(async (s) => {
        const member = await ctx.db.get(s.memberId);
        return {
          _id: s._id,
          kind: 'pt' as const,
          startsAt: s.scheduledAt,
          endsAt: s.scheduledAt + s.durationMinutes * 60 * 1000,
          member,
          status: s.status,
          durationMinutes: s.durationMinutes,
        };
      })
    );

    const classesWithType = await Promise.all(
      classInstances.map(async (c) => {
        const classType = await ctx.db.get(c.classTypeId);
        return {
          _id: c._id,
          kind: 'class' as const,
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          classType,
          bookedCount: c.bookedCount,
          capacity: c.capacity,
          status: c.status,
        };
      })
    );

    const items = [...ptWithMember, ...classesWithType].sort(
      (a, b) => a.startsAt - b.startsAt
    );

    return { weekStart, weekEnd, items };
  },
});

/**
 * Distinct list of members who have at least one PT session with the
 * current trainer, plus last/next session and total session count.
 */
export const getMyClients = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const sessions = await ctx.db
      .query('ptSessions')
      .withIndex('by_trainer', (q) => q.eq('trainerId', user._id))
      .collect();

    const byMember = new Map<
      string,
      {
        memberId: string;
        sessions: typeof sessions;
      }
    >();
    for (const s of sessions) {
      const key = s.memberId as unknown as string;
      if (!byMember.has(key)) {
        byMember.set(key, { memberId: key, sessions: [] });
      }
      byMember.get(key)!.sessions.push(s);
    }

    const clients = await Promise.all(
      Array.from(byMember.values()).map(async ({ memberId, sessions: ss }) => {
        const member = await ctx.db.get(memberId as any);
        const memberProfile = await ctx.db
          .query('memberProfiles')
          .withIndex('by_user', (q) => q.eq('userId', memberId as any))
          .first();
        const sorted = [...ss].sort((a, b) => a.scheduledAt - b.scheduledAt);
        const now = Date.now();
        const last = [...ss]
          .filter((s) => s.scheduledAt < now)
          .sort((a, b) => b.scheduledAt - a.scheduledAt)[0];
        const next = [...ss]
          .filter((s) => s.scheduledAt >= now && s.status === 'scheduled')
          .sort((a, b) => a.scheduledAt - b.scheduledAt)[0];
        return {
          member,
          memberProfile,
          sessionCount: ss.length,
          completedCount: ss.filter((s) => s.status === 'completed').length,
          lastSessionAt: last?.scheduledAt ?? null,
          nextSessionAt: next?.scheduledAt ?? null,
        };
      })
    );

    // Sort by next session ascending, then by recent activity
    clients.sort((a, b) => {
      const an = a.nextSessionAt ?? Number.MAX_SAFE_INTEGER;
      const bn = b.nextSessionAt ?? Number.MAX_SAFE_INTEGER;
      return an - bn;
    });

    return clients;
  },
});

/**
 * Detail for a single member from the trainer's perspective: profile,
 * recent sessions, latest notes.
 */
export const getClientDetail = query({
  args: { memberId: v.id('users') },
  handler: async (ctx, { memberId }) => {
    const user = await requireUser(ctx);
    const member = await ctx.db.get(memberId);
    const memberProfile = await ctx.db
      .query('memberProfiles')
      .withIndex('by_user', (q) => q.eq('userId', memberId))
      .first();

    // Only show sessions between this trainer and this member
    const recentSessions = await ctx.db
      .query('ptSessions')
      .withIndex('by_trainer', (q) => q.eq('trainerId', user._id))
      .filter((q) => q.eq(q.field('memberId'), memberId))
      .order('desc')
      .take(20);

    const latestNotes = await ctx.db
      .query('trainerNotes')
      .withIndex('by_trainer', (q) => q.eq('trainerId', user._id))
      .filter((q) => q.eq(q.field('memberId'), memberId))
      .order('desc')
      .take(5);

    return { member, memberProfile, recentSessions, latestNotes };
  },
});

/**
 * Current trainer's earnings records (one per PT session) with session
 * info, ordered most-recent first.
 */
export const getMyEarnings = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const records = await ctx.db
      .query('trainerEarnings')
      .withIndex('by_trainer', (q) => q.eq('trainerId', user._id))
      .order('desc')
      .collect();

    const withSession = await Promise.all(
      records.map(async (r) => {
        const session = await ctx.db.get(r.sessionId);
        return { ...r, session };
      })
    );

    return withSession;
  },
});

/**
 * Current user's trainer profile (or null).
 */
export const getMyTrainerProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('trainerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();
  },
});

// ============================================================
// Owner queries — members directory
// ============================================================

/**
 * All member profiles joined with user info, with optional search by
 * name/email and filter by membership status. Paginated.
 */
export const getMembersDirectory = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal('active'),
        v.literal('pending'),
        v.literal('frozen'),
        v.literal('cancelled'),
        v.literal('expired'),
        v.literal('trial'),
        v.literal('all')
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { search, status = 'all', limit = 50 }) => {
    await requireUser(ctx);
    const members = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('activeRole'), 'member'))
      .take(500);

    const results = await Promise.all(
      members.map(async (m) => {
        const profile = await ctx.db
          .query('memberProfiles')
          .withIndex('by_user', (q) => q.eq('userId', m._id))
          .first();
        const membership = await ctx.db
          .query('memberships')
          .withIndex('by_user', (q) => q.eq('userId', m._id))
          .order('desc')
          .first();
        return { user: m, profile, membership };
      })
    );

    const q = (search ?? '').trim().toLowerCase();
    const filtered = results.filter(({ user, membership }) => {
      if (q) {
        const hay =
          `${user.fullName} ${user.email} ${user.phone ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status && status !== 'all') {
        if (!membership) return false;
        if (membership.status !== status) return false;
      }
      return true;
    });

    return filtered.slice(0, limit);
  },
});

/**
 * Full owner-side member detail: profile + active membership + recent
 * payments + recent visits + trainer notes.
 */
export const getOwnerMemberDetail = query({
  args: { memberId: v.id('users') },
  handler: async (ctx, { memberId }) => {
    await requireUser(ctx);
    const member = await ctx.db.get(memberId);
    const profile = await ctx.db
      .query('memberProfiles')
      .withIndex('by_user', (q) => q.eq('userId', memberId))
      .first();

    const memberships = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', memberId))
      .order('desc')
      .collect();
    const activeMembership = memberships.find(
      (m) => m.status === 'active' || m.status === 'trial'
    );

    const payments = await ctx.db
      .query('payments')
      .withIndex('by_user', (q) => q.eq('userId', memberId))
      .order('desc')
      .take(10);

    const visits = await ctx.db
      .query('accessEvents')
      .withIndex('by_user', (q) => q.eq('userId', memberId))
      .order('desc')
      .take(20);

    // Notes: any trainer notes written about this member
    const notes = await ctx.db
      .query('trainerNotes')
      .withIndex('by_member', (q) => q.eq('memberId', memberId))
      .order('desc')
      .take(10);

    return {
      member,
      profile,
      activeMembership,
      memberships,
      payments,
      visits,
      notes,
    };
  },
});

// ============================================================
// Punch clock queries
// ============================================================

/**
 * Most recent punch event for the current user plus a computed status
 * (clocked in vs clocked out) and hours worked today.
 */
export const getLatestPunch = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const latest = await ctx.db
      .query('punchEvents')
      .withIndex('by_user_timestamp', (q) => q.eq('userId', user._id))
      .order('desc')
      .first();

    // Compute "today" window
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    // Week window (Mon-Sun)
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + diffToMonday
    ).getTime();

    // All punches today, oldest first
    const todayPunches = await ctx.db
      .query('punchEvents')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', user._id).gte('timestamp', startOfDay)
      )
      .filter((q) => q.lt(q.field('timestamp'), endOfDay))
      .collect();
    todayPunches.sort((a, b) => a.timestamp - b.timestamp);

    const weekPunches = await ctx.db
      .query('punchEvents')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', user._id).gte('timestamp', monday)
      )
      .collect();
    weekPunches.sort((a, b) => a.timestamp - b.timestamp);

    const hoursWorked = (events: { punchType: 'in' | 'out'; timestamp: number }[]) => {
      let totalMs = 0;
      let openIn: number | null = null;
      for (const e of events) {
        if (e.punchType === 'in') {
          openIn = e.timestamp;
        } else if (e.punchType === 'out' && openIn != null) {
          totalMs += e.timestamp - openIn;
          openIn = null;
        }
      }
      if (openIn != null) {
        // Still clocked in — count time until now
        totalMs += Date.now() - openIn;
      }
      return totalMs / (1000 * 60 * 60);
    };

    const recent = await ctx.db
      .query('punchEvents')
      .withIndex('by_user_timestamp', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(5);

    const isClockedIn =
      latest != null && latest.punchType === 'in' ? true : false;

    return {
      latest,
      isClockedIn,
      hoursToday: hoursWorked(todayPunches),
      hoursThisWeek: hoursWorked(weekPunches),
      recent,
    };
  },
});

/**
 * Return all trainer profiles that are currently accepting new clients,
 * joined with the underlying user record so the UI can show names/avatars.
 */
export const getAvailableTrainers = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query('trainerProfiles')
      .withIndex('by_available', (q) => q.eq('isAvailable', true))
      .collect();
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return { ...p, user };
      })
    );
    return enriched;
  },
});
