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
 * Process a QR scan (called by the scanner app or hardware bridge).
 * Returns the access decision and the member info (if granted) so the
 * caller can show a personalised result.
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
    let userId: any = undefined;
    let user: any = null;

    if (!credential) {
      reason = 'Invalid token';
    } else if (credential.tokenExpiresAt < Date.now()) {
      reason = 'Token expired';
    } else if (credential.status !== 'active') {
      reason = `Credential ${credential.status}`;
    } else {
      granted = true;
      userId = credential.userId;
      user = await ctx.db.get(credential.userId);
    }

    // Build the event row. If we have no credential we still log it but
    // we need a placeholder userId to satisfy the schema. We use a
    // dedicated "system" user that is created on demand.
    if (!userId) {
      const system = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', 'system@queenix.local'))
        .first();
      if (system) {
        userId = system._id;
      } else {
        userId = await ctx.db.insert('users', {
          email: 'system@queenix.local',
          fullName: 'System',
          activeRole: 'owner',
          roles: ['owner'],
          emailVerified: false,
          phoneVerified: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    const credentialId = credential?._id ?? (await ensureSystemCredential(ctx))._id;

    await ctx.db.insert('accessEvents', {
      userId,
      credentialId,
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

    return {
      granted,
      reason,
      user: user
        ? {
            _id: user._id,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
          }
        : null,
    };
  },
});

/**
 * Internal helper — guarantees a system-level credential so we can
 * always log access events even for invalid tokens.
 */
async function ensureSystemCredential(ctx: any) {
  const existing = await ctx.db
    .query('accessCredentials')
    .withIndex('by_token', (q: any) => q.eq('token', '__system__'))
    .first();
  if (existing) return existing;
  // We need a membership row too. The schema requires it.
  const membership = await ctx.db
    .query('memberships')
    .filter((q: any) => q.eq(q.field('autoRenew'), false))
    .first();
  let membershipId = membership?._id;
  if (!membershipId) {
    // Create a placeholder membership plan + membership
    const planId = await ctx.db.insert('membershipPlans', {
      name: '__system__',
      description: 'placeholder for system events',
      durationDays: 1,
      priceCents: 0,
      currency: 'AED',
      features: [],
      isActive: false,
      isTrial: false,
      trialDays: 0,
      maxClassesPerMonth: 0,
      maxPTSessions: 0,
    });
    const sysUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q: any) => q.eq('email', 'system@queenix.local'))
      .first();
    const sysUserId =
      sysUser?._id ??
      (await ctx.db.insert('users', {
        email: 'system@queenix.local',
        fullName: 'System',
        activeRole: 'owner',
        roles: ['owner'],
        emailVerified: false,
        phoneVerified: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
    membershipId = await ctx.db.insert('memberships', {
      userId: sysUserId,
      planId,
      status: 'expired',
      startDate: 0,
      endDate: 0,
      freezes: [],
      autoRenew: false,
      remainingClasses: 0,
      remainingPTSessions: 0,
    });
  }
  const id = await ctx.db.insert('accessCredentials', {
    userId: (
      await ctx.db
        .query('users')
        .withIndex('by_email', (q: any) => q.eq('email', 'system@queenix.local'))
        .first()
    )._id,
    membershipId,
    status: 'expired',
    token: '__system__',
    tokenExpiresAt: 0,
  });
  return await ctx.db.get(id);
}
