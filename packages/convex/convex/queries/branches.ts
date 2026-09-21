/**
 * Queenix Gym — Branches & events queries.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireRole, requireUser } from '../_helpers';

export const branchesList = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, { includeInactive = true }) => {
    await requireUser(ctx);
    const all = await ctx.db.query('branches').order('asc').take(100);
    const branches = includeInactive
      ? all
      : all.filter((b) => b.isActive);
    return await Promise.all(
      branches.map(async (branch) => {
        const links = await ctx.db
          .query('branchStaff')
          .withIndex('by_branch', (q) => q.eq('branchId', branch._id))
          .take(200);
        const upcomingEvents = await ctx.db
          .query('gymEvents')
          .withIndex('by_branch', (q) => q.eq('branchId', branch._id))
          .filter((q) =>
            q.and(
              q.gte(q.field('startsAt'), Date.now()),
              q.eq(q.field('status'), 'scheduled')
            )
          )
          .take(50);
        return { branch, staffCount: links.length, upcomingEventCount: upcomingEvents.length };
      })
    );
  },
});

export const branchDetail = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, { branchId }) => {
    await requireUser(ctx);
    const branch = await ctx.db.get(branchId);
    if (!branch) return null;
    const links = await ctx.db
      .query('branchStaff')
      .withIndex('by_branch', (q) => q.eq('branchId', branchId))
      .collect();
    const staff = await Promise.all(
      links.map(async (l) => ({ link: l, user: await ctx.db.get(l.userId) }))
    );
    const events = await ctx.db
      .query('gymEvents')
      .withIndex('by_branch', (q) => q.eq('branchId', branchId))
      .order('desc')
      .take(50);
    return { branch, staff, events };
  },
});

/** All staff assignments for one user (which branches they work at). */
export const staffBranches = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    await requireRole(ctx, ['owner', 'operations']);
    const links = await ctx.db
      .query('branchStaff')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return await Promise.all(
      links.map(async (l) => ({ link: l, branch: await ctx.db.get(l.branchId) }))
    );
  },
});

export const eventsList = query({
  args: {
    branchId: v.optional(v.id('branches')),
    upcomingOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { branchId, upcomingOnly = false, limit = 100 }) => {
    await requireUser(ctx);
    let events;
    if (branchId) {
      events = await ctx.db
        .query('gymEvents')
        .withIndex('by_branch', (q) => q.eq('branchId', branchId))
        .order('desc')
        .take(limit);
    } else {
      events = await ctx.db
        .query('gymEvents')
        .withIndex('by_startsAt', (q) => q.gte('startsAt', 0))
        .order('desc')
        .take(limit);
    }
    const filtered = upcomingOnly
      ? events.filter(
          (e) => e.status === 'scheduled' && e.startsAt >= Date.now()
        )
      : events;
    return await Promise.all(
      filtered.map(async (e) => ({
        event: e,
        branch: e.branchId ? await ctx.db.get(e.branchId) : null,
      }))
    );
  },
});
