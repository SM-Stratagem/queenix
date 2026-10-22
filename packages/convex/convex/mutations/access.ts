/**
 * Queenix Gym — Access mutations
 */

import { v } from 'convex/values';
import { internalMutation, mutation, type MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { requireUser } from '../_helpers';
import { requireCapability } from '../permissions';
import { ConvexError } from 'convex/values';

/** Unguessable token (no user id, crypto randomness). */
function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

type MembershipLike = { _id: Id<'memberships'>; status: string; endDate: number };

/** The membership that currently admits entry (active/trial, not past its end). */
export function admittingMembership<M extends MembershipLike>(memberships: M[], now: number): M | null {
  return memberships.find((m) => (m.status === 'active' || m.status === 'trial') && m.endDate >= now) ?? null;
}

/**
 * Pure door decision. Denied reasons are distinct so staff can tell an
 * unknown/used token from an expired one or a lapsed membership.
 */
export function accessDecision(
  credential: { status: string; tokenExpiresAt: number } | null,
  memberships: MembershipLike[],
  now: number,
): { granted: boolean; reason?: string } {
  if (!credential) return { granted: false, reason: 'Invalid or already used token' };
  if (credential.status !== 'active') return { granted: false, reason: `Credential ${credential.status}` };
  if (credential.tokenExpiresAt < now) return { granted: false, reason: 'Token expired' };
  if (!admittingMembership(memberships, now)) {
    const latest = memberships[0];
    const why = latest?.status === 'frozen' ? 'frozen' : latest?.status === 'cancelled' ? 'cancelled' : 'expired';
    return { granted: false, reason: latest ? `Membership ${why}` : 'No membership' };
  }
  return { granted: true };
}

async function membershipsOf(ctx: MutationCtx, userId: Id<'users'>) {
  return await ctx.db
    .query('memberships')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .order('desc')
    .take(10);
}

/**
 * Rotate the QR access token (called every 60s by the client).
 * Returns a new token + expiry. Old token is invalidated atomically.
 * Creates the member's credential on first use when they hold an admitting
 * membership (credentials used to exist only for seeded demo users).
 */
export const rotateAccessToken = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const creds = await ctx.db
      .query('accessCredentials')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .take(10);
    let credential = creds.find((c) => c.status === 'active') ?? null;
    const now = Date.now();
    const tokenExpiresAt = now + 60 * 1000; // 60 seconds
    const token = randomToken();
    if (!credential) {
      // A blocked credential stays blocked; otherwise issue one for a paying member.
      const membership = creds.some((c) => c.status === 'blocked')
        ? null
        : admittingMembership(await membershipsOf(ctx, user._id), now);
      if (!membership) {
        throw new ConvexError({ code: 'NO_CREDENTIAL', message: 'No active access credential' });
      }
      await ctx.db.insert('accessCredentials', {
        userId: user._id,
        membershipId: membership._id,
        status: 'active',
        token,
        tokenExpiresAt,
      });
      return { token, tokenExpiresAt };
    }
    await ctx.db.patch(credential._id, { token, tokenExpiresAt });
    return { token, tokenExpiresAt };
  },
});

const scanArgs = {
  token: v.string(),
  accessPointId: v.string(),
  direction: v.union(v.literal('in'), v.literal('out')),
};

/** QR scan from the staff scanner screen (mobile ops). Staff only. */
export const processAccessScan = mutation({
  args: scanArgs,
  handler: async (ctx, args) => {
    await requireCapability(ctx, 'bookings.scan');
    return scan(ctx, args);
  },
});

/** Same scan from the hardware bridge (/api/scanner/qr, admin key). */
export const processAccessScanInternal = internalMutation({
  args: scanArgs,
  handler: (ctx, args) => scan(ctx, args),
});

/**
 * Decide + log one QR scan. Returns the access decision and the member
 * info (if granted) so the caller can show a personalised result.
 * A granted scan burns the token (single use: no screenshot replays).
 */
async function scan(
  ctx: MutationCtx,
  { token, accessPointId, direction }: { token: string; accessPointId: string; direction: 'in' | 'out' },
) {
  const now = Date.now();
  const credential = await ctx.db
    .query('accessCredentials')
    .withIndex('by_token', (q) => q.eq('token', token))
    .first();
  const memberships = credential ? await membershipsOf(ctx, credential.userId) : [];
  const { granted, reason } = accessDecision(credential, memberships, now);
  const user = granted && credential ? await ctx.db.get(credential.userId) : null;

  // Unknown tokens log with no user/credential (never a placeholder user).
  await ctx.db.insert('accessEvents', {
    userId: credential?.userId,
    credentialId: credential?._id,
    accessPointId,
    direction,
    granted,
    reason,
    timestamp: now,
  });

  if (granted && credential) {
    await ctx.db.patch(credential._id, { lastUsedAt: now, token: randomToken(), tokenExpiresAt: 0 });
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
      timestamp: now,
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
}
