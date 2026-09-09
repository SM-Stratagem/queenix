/**
 * Queenix Gym — Access & QR queries
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireUser } from '../_helpers';

export const getMyAccessCredential = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('accessCredentials')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();
  },
});

export const getCurrentOccupancy = query({
  args: { accessPointId: v.optional(v.string()) },
  handler: async (ctx, { accessPointId }) => {
    // Get most recent snapshot
    let q = ctx.db.query('occupancySnapshots');
    if (accessPointId) {
      q = q.withIndex('by_accessPoint_timestamp', (q) => q.eq('accessPointId', accessPointId));
    }
    const snapshot = await q.order('desc').first();
    return snapshot;
  },
});

export const getRecentAccessEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    return await ctx.db
      .query('accessEvents')
      .withIndex('by_timestamp', (q) => q.gt('timestamp', Date.now() - 24 * 60 * 60 * 1000))
      .order('desc')
      .take(limit);
  },
});
