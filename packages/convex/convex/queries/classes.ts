/**
 * Queenix Gym — Class queries
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireUser } from '../_helpers';

export const getUpcomingClasses = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    const now = Date.now();
    return await ctx.db
      .query('classInstances')
      .withIndex('by_startsAt', (q) => q.gt('startsAt', now))
      .filter((q) => q.eq(q.field('status'), 'scheduled'))
      .order('asc')
      .take(limit);
  },
});

export const getClassById = query({
  args: { id: v.id('classInstances') },
  handler: async (ctx, { id }) => {
    const classInstance = await ctx.db.get(id);
    if (!classInstance) return null;
    const classType = await ctx.db.get(classInstance.classTypeId);
    const trainer = classInstance.trainerId ? await ctx.db.get(classInstance.trainerId) : null;
    return { ...classInstance, classType, trainer };
  },
});

export const getMyBookings = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    const user = await requireUser(ctx);
    let q = ctx.db.query('bookings').withIndex('by_user', (q) => q.eq('userId', user._id));
    const bookings = await q.order('desc').take(50);
    if (status) return bookings.filter((b) => b.status === status);
    return bookings;
  },
});

export const getClassRoster = query({
  args: { classInstanceId: v.id('classInstances') },
  handler: async (ctx, { classInstanceId }) => {
    const bookings = await ctx.db
      .query('bookings')
      .withIndex('by_classInstance', (q) => q.eq('classInstanceId', classInstanceId))
      .filter((q) => q.eq(q.field('status'), 'confirmed'))
      .collect();
    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const user = await ctx.db.get(b.userId);
        return { ...b, user };
      })
    );
    return enriched;
  },
});
