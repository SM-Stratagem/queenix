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
    const classInstances = await ctx.db
      .query('classInstances')
      .withIndex('by_startsAt', (q) => q.gt('startsAt', now))
      .filter((q) => q.eq(q.field('status'), 'scheduled'))
      .order('asc')
      .take(limit);
    const enriched = await Promise.all(
      classInstances.map(async (ci) => {
        const classType = await ctx.db.get(ci.classTypeId);
        const trainer = ci.trainerId ? await ctx.db.get(ci.trainerId) : null;
        return {
          ...ci,
          classType: classType
            ? {
                _id: classType._id,
                name: classType.name,
                category: classType.category,
                difficulty: classType.difficulty,
                durationMinutes: classType.durationMinutes,
              }
            : null,
          trainer: trainer
            ? {
                _id: trainer._id,
                fullName: trainer.fullName,
                avatarUrl: trainer.avatarUrl,
              }
            : null,
        };
      })
    );
    return enriched;
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

/**
 * Today's class roster for the operations dashboard.
 * Returns classInstances that start today (00:00 → 23:59) with
 * the classType, trainer, and a roster preview of the first 5
 * confirmed attendees.
 */
export const getTodayRoster = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const classInstances = await ctx.db
      .query('classInstances')
      .withIndex('by_startsAt', (q) =>
        q.gte('startsAt', startOfDay).lt('startsAt', endOfDay)
      )
      .order('asc')
      .collect();

    const enriched = await Promise.all(
      classInstances.map(async (ci) => {
        const classType = await ctx.db.get(ci.classTypeId);
        const trainer = ci.trainerId ? await ctx.db.get(ci.trainerId) : null;

        const bookings = await ctx.db
          .query('bookings')
          .withIndex('by_classInstance', (q) => q.eq('classInstanceId', ci._id))
          .filter((q) => q.eq(q.field('status'), 'confirmed'))
          .take(5);

        const rosterPreview = await Promise.all(
          bookings.map(async (b) => {
            const user = await ctx.db.get(b.userId);
            return {
              _id: b._id,
              userId: b.userId,
              status: b.status,
              bookedAt: b.bookedAt,
              user: user
                ? {
                    _id: user._id,
                    fullName: user.fullName,
                    avatarUrl: user.avatarUrl,
                  }
                : null,
            };
          })
        );

        return {
          ...ci,
          classType: classType
            ? {
                _id: classType._id,
                name: classType.name,
                category: classType.category,
                difficulty: classType.difficulty,
                durationMinutes: classType.durationMinutes,
              }
            : null,
          trainer: trainer
            ? {
                _id: trainer._id,
                fullName: trainer.fullName,
                avatarUrl: trainer.avatarUrl,
              }
            : null,
          rosterPreview,
        };
      })
    );

    return enriched;
  },
});
