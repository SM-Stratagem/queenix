/**
 * Queenix Gym — Access mutations
 */

import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireUser, audit } from '../_helpers';
import { ConvexError } from 'convex/values';

/**
 * Rotate the QR access token (called every 60s by the client).
 * Returns a new token + expiry. Old token is invalidated atomically.
 */
export const rotateAccessToken = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const credential = await ctx.db
      .query('accessCredentials')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();
    if (!credential) {
      throw new ConvexError({ code: 'NO_CREDENTIAL', message: 'No active access credential' });
    }
    const tokenExpiresAt = Date.now() + 60 * 1000; // 60 seconds
    const token = `${user._id}-${tokenExpiresAt}-${Math.random().toString(36).slice(2, 10)}`;
    await ctx.db.patch(credential._id, { token, tokenExpiresAt });
    return { token, tokenExpiresAt };
  },
});

/**
 * Process a QR scan (called by the scanner app via operations role).
 */
export const processAccessScan = mutation({
  args: {
    token: v.string(),
    accessPointId: v.string(),
    direction: v.union(v.literal('in'), v.literal('out')),
  },
  handler: async (ctx, { token, accessPointId, direction }) => {
    const credential = await ctx.db
      .query('accessCredentials')
      .withIndex('by_token', (q) => q.eq('token', token))
      .first();

    let granted = false;
    let reason: string | undefined;
    if (!credential) {
      reason = 'Invalid token';
    } else if (credential.tokenExpiresAt < Date.now()) {
      reason = 'Token expired';
    } else if (credential.status !== 'active') {
      reason = `Credential ${credential.status}`;
    } else {
      granted = true;
    }

    // Log the event regardless
    const eventId = await ctx.db.insert('accessEvents', {
      userId: credential?.userId ?? (await ctx.db.insert('users', {
        email: 'unknown@invalid.local',
        fullName: 'Unknown',
        activeRole: 'member',
        roles: ['member'],
        emailVerified: false,
        phoneVerified: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }) as any),
      credentialId: credential?._id ?? (eventIdPlaceholder as any),
      accessPointId,
      direction,
      granted,
      reason,
      timestamp: Date.now(),
    });

    if (granted && credential) {
      await ctx.db.patch(credential._id, { lastUsedAt: Date.now() });
      // Update occupancy snapshot
      const lastSnapshot = await ctx.db
        .query('occupancySnapshots')
        .withIndex('by_accessPoint_timestamp', (q) => q.eq('accessPointId', accessPointId))
        .order('desc')
        .first();
      const delta = direction === 'in' ? 1 : -1;
      const newCount = Math.max(0, (lastSnapshot?.count ?? 0) + delta);
      await ctx.db.insert('occupancySnapshots', {
        accessPointId,
        count: newCount,
        timestamp: Date.now(),
      });
    }

    return { granted, reason };
  },
});

// Internal helper placeholder
const eventIdPlaceholder = 'placeholder' as any;
