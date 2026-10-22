/**
 * Queenix Gym — modular custom access: capability grant management.
 *
 * Grants are ADDITIVE ONLY: they add capabilities to a user (globally or
 * scoped to one branch) and can never remove role-implied capabilities.
 * Granting/revoking needs staff.manage AND passes grantChangeError: the
 * actor holds the capability via their role, outranks the target, and
 * never grants to themselves. Every change is audited.
 */

import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { audit } from '../_helpers';
import { forbidIf, grantChangeError, requireCapability, type Role } from '../permissions';

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
  v.literal('member.self'),
  v.literal('content.manage'),
  v.literal('notifications.push')
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
    forbidIf(
      grantChangeError(
        { id: actor._id, roles: actor.roles as Role[] },
        { id: target._id, roles: target.roles as Role[] },
        args.capability,
      ),
    );
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
      await audit(ctx, {
        actorId: actor._id,
        action: 'capabilityGrant.updated',
        entityType: 'capabilityGrant',
        entityId: sameScope._id,
        before: { expiresAt: sameScope.expiresAt ?? null, note: sameScope.note ?? null },
        after: { expiresAt: args.expiresAt ?? null, note: args.note ?? null },
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
    await audit(ctx, {
      actorId: actor._id,
      action: 'capabilityGrant.created',
      entityType: 'capabilityGrant',
      entityId: grantId,
      after: {
        userId: args.userId,
        capability: args.capability,
        branchId: args.branchId ?? null,
        expiresAt: args.expiresAt ?? null,
      },
    });
    return { ok: true, grantId, updated: false };
  },
});

/** Revoke a capability grant by id. */
export const revokeCapability = mutation({
  args: { grantId: v.id('capabilityGrants') },
  handler: async (ctx, { grantId }) => {
    const actor = await requireCapability(ctx, 'staff.manage');
    const grant = await ctx.db.get(grantId);
    if (!grant) throw new Error('Grant not found');
    const target = await ctx.db.get(grant.userId);
    forbidIf(
      grantChangeError(
        { id: actor._id, roles: actor.roles as Role[] },
        { id: grant.userId, roles: (target?.roles ?? []) as Role[] },
        grant.capability,
        { revoke: true },
      ),
    );
    await ctx.db.delete(grantId);
    await audit(ctx, {
      actorId: actor._id,
      action: 'capabilityGrant.revoked',
      entityType: 'capabilityGrant',
      entityId: grantId,
      before: { ...grant },
    });
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
