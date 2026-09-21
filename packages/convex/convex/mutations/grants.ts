/**
 * Queenix Gym — modular custom access: capability grant management.
 *
 * Grants are ADDITIVE ONLY: they add capabilities to a user (globally or
 * scoped to one branch) and can never remove role-implied capabilities.
 * All three endpoints require staff.manage / staff.read so only
 * privileged staff can hand out access.
 */

import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { requireCapability } from '../permissions';

const capabilityLiteral = v.union(
  v.literal('platform.manage'),
  v.literal('finance.read'),
  v.literal('finance.write'),
  v.literal('staff.manage'),
  v.literal('staff.read'),
  v.literal('classes.manage'),
  v.literal('bookings.manage'),
  v.literal('bookings.scan'),
  v.literal('salon.serve'),
  v.literal('coffee.serve'),
  v.literal('training.coach'),
  v.literal('member.self')
);

/** Grant a capability to a user (idempotent per user+capability+branch). */
export const grantCapability = mutation({
  args: {
    userId: v.id('users'),
    capability: capabilityLiteral,
    branchId: v.optional(v.id('branches')),
    expiresAt: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireCapability(ctx, 'staff.manage');
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error('User not found');
    const existing = await ctx.db
      .query('capabilityGrants')
      .withIndex('by_user_capability', (q) =>
        q.eq('userId', args.userId).eq('capability', args.capability),
      )
      .collect();
    const sameScope = existing.find(
      (g) => (g.branchId ?? null) === (args.branchId ?? null),
    );
    if (sameScope) {
      await ctx.db.patch(sameScope._id, {
        expiresAt: args.expiresAt,
        note: args.note,
      });
      return { ok: true, grantId: sameScope._id, updated: true };
    }
    const grantId = await ctx.db.insert('capabilityGrants', {
      userId: args.userId,
      capability: args.capability,
      branchId: args.branchId,
      grantedBy: actor._id,
      grantedAt: Date.now(),
      expiresAt: args.expiresAt,
      note: args.note,
    });
    return { ok: true, grantId, updated: false };
  },
});

/** Revoke a capability grant by id. */
export const revokeCapability = mutation({
  args: { grantId: v.id('capabilityGrants') },
  handler: async (ctx, { grantId }) => {
    await requireCapability(ctx, 'staff.manage');
    const grant = await ctx.db.get(grantId);
    if (!grant) throw new Error('Grant not found');
    await ctx.db.delete(grantId);
    return { ok: true };
  },
});

/** List a user's capability grants (newest first). */
export const listGrantsForUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    await requireCapability(ctx, 'staff.read');
    const grants = await ctx.db
      .query('capabilityGrants')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return grants.sort((a, b) => b.grantedAt - a.grantedAt);
  },
});
