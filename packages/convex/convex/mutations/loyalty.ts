/**
 * Queenix Gym — Loyalty mutations
 */

import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireUser, audit } from '../_helpers';
import { ConvexError } from 'convex/values';

/**
 * Redeemable perks. Cost lives server-side so a client can't choose its own
 * price. ponytail: constant catalogue; move to a table when staff need to edit it.
 */
export const REWARDS = [
  { id: 'smoothie', name: 'Free smoothie at the café', cost: 300 },
  { id: 'guest-pass', name: 'Guest day pass', cost: 500 },
  { id: 'salon-blowout', name: 'Salon blowout', cost: 1200 },
  { id: 'pt-session', name: '1× PT session', cost: 1500 },
] as const;

export const redeemReward = mutation({
  args: { rewardId: v.string() },
  handler: async (ctx, { rewardId }) => {
    const user = await requireUser(ctx);
    const reward = REWARDS.find((r) => r.id === rewardId);
    if (!reward) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Unknown reward' });
    }
    // Compute current balance
    const entries = await ctx.db
      .query('loyaltyLedger')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    const balance = entries.reduce((acc, e) => acc + e.points, 0);
    if (balance < reward.cost) {
      throw new ConvexError({
        code: 'INSUFFICIENT_POINTS',
        message: `Need ${reward.cost} points, have ${balance}`,
      });
    }
    const id = await ctx.db.insert('loyaltyLedger', {
      userId: user._id,
      type: 'redeemed',
      points: -reward.cost,
      reason: reward.name,
      referenceId: reward.id,
      createdAt: Date.now(),
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'loyalty.redeemed',
      entityType: 'loyalty',
      entityId: id,
      after: { rewardId: reward.id, points: reward.cost },
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
