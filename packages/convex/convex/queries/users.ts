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
