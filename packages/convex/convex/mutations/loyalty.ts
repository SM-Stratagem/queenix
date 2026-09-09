/**
 * Queenix Gym — Loyalty mutations
 */

import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireUser, audit } from '../_helpers';
import { ConvexError } from 'convex/values';

export const redeemReward = mutation({
  args: {
    points: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, { points, reason }) => {
    const user = await requireUser(ctx);
    if (points <= 0) {
      throw new ConvexError({ code: 'INVALID_AMOUNT', message: 'Points must be positive' });
    }
    // Compute current balance
    const entries = await ctx.db
      .query('loyaltyLedger')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    const balance = entries.reduce((acc, e) => acc + e.points, 0);
    if (balance < points) {
      throw new ConvexError({
        code: 'INSUFFICIENT_POINTS',
        message: `Need ${points} points, have ${balance}`,
      });
    }
    const id = await ctx.db.insert('loyaltyLedger', {
      userId: user._id,
      type: 'redeemed',
      points: -points,
      reason,
      createdAt: Date.now(),
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'loyalty.redeemed',
      entityType: 'loyalty',
      entityId: id,
      after: { points, reason },
    });
    return id;
  },
});

export const createReferral = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const code = `${user._id.slice(-6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const id = await ctx.db.insert('referrals', {
      referrerId: user._id,
      code,
      status: 'pending',
      rewardPoints: 500,
      createdAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});
