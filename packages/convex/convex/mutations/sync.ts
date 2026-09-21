/**
 * Queenix Gym — Convex sync from BetterAuth
 * Called by BetterAuth `databaseHooks.user.create.after` to mirror the user
 * into the Convex `users` table.
 */

import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';

export const syncFromBetterAuth = internalMutation({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
    fullName: v.string(),
    roles: v.array(
      v.union(
        v.literal('member'),
        v.literal('trainer'),
        v.literal('finance'),
        v.literal('owner'),
        v.literal('operations')
      )
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_betterAuthUserId', (q) => q.eq('betterAuthUserId', args.betterAuthUserId))
      .first();
    if (existing) return existing._id;

    const userId = await ctx.db.insert('users', {
      email: args.email,
      fullName: args.fullName,
      activeRole: args.roles[0] ?? 'member',
      roles: args.roles,
      emailVerified: false,
      phoneVerified: false,
      betterAuthUserId: args.betterAuthUserId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create member profile for the member role
    if (args.roles.includes('member')) {
      await ctx.db.insert('memberProfiles', {
        userId,
        vehicles: [],
        preferences: { notifications: true, marketing: false, language: 'en' },
      });
    }

    return userId;
  },
});
