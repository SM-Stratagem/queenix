/**
 * Queenix Gym — phone push token registration (Expo Push).
 * The mobile app registers its Expo push token after sign-in and clears it
 * on sign-out. Stored in the EXISTING `devices` table; the token itself is
 * the device fingerprint (one Expo token per app install).
 */

import { v } from 'convex/values';

import { mutation } from '../_generated/server';
import { requireUser } from '../_helpers';

const TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

export const registerPushToken = mutation({
  args: {
    token: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android'), v.literal('web')),
  },
  handler: async (ctx, { token, platform }) => {
    const user = await requireUser(ctx);
    if (!TOKEN_RE.test(token)) throw new Error('Not an Expo push token');
    const now = Date.now();
    const existing = await ctx.db
      .query('devices')
      .withIndex('by_fingerprint', (q) => q.eq('deviceFingerprint', token))
      .first();
    if (existing) {
      // Re-register, or the phone changed hands: the token follows the signed-in user.
      await ctx.db.patch('devices', existing._id, {
        userId: user._id,
        platform,
        pushToken: token,
        lastActiveAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert('devices', {
      userId: user._id,
      deviceFingerprint: token,
      platform,
      pushToken: token,
      lastActiveAt: now,
      createdAt: now,
    });
  },
});

export const unregisterPushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx);
    const row = await ctx.db
      .query('devices')
      .withIndex('by_fingerprint', (q) => q.eq('deviceFingerprint', token))
      .first();
    if (!row || row.userId !== user._id) return false;
    await ctx.db.patch('devices', row._id, { pushToken: undefined, lastActiveAt: Date.now() });
    return true;
  },
});
