/**
 * Queenix Gym — Membership queries
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireUser } from '../_helpers';

export const getCurrentMembership = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const membership = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.or(q.eq(q.field('status'), 'active'), q.eq(q.field('status'), 'trial')))
      .first();
    if (!membership) return null;
    const plan = await ctx.db.get(membership.planId);
    return { ...membership, plan };
  },
});

export const getAvailablePlans = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('membershipPlans')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .collect();
  },
});

export const getMembershipHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(limit);
  },
});
