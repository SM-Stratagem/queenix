/**
 * Queenix Gym — Membership admin mutations (staff only: admin / superadmin / owner).
 *
 * The member-self lifecycle in mutations/payments.ts (freezeMembership,
 * unfreezeMembership, cancelMembership) requires the caller to own the
 * membership, so staff cannot use it on behalf of a member. These admin
 * variants carry the same state machine but authorize by staff role and
 * audit the acting staff member.
 */

import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireRole, audit } from '../_helpers';
import { ConvexError } from 'convex/values';

const STAFF_ROLES = ['admin', 'superadmin', 'owner'] as any;

export const freezeAnyMembership = mutation({
  args: {
    membershipId: v.id('memberships'),
    days: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { membershipId, days, reason }) => {
    const staff = await requireRole(ctx as any, STAFF_ROLES);
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new ConvexError({ code: 'NOT_FOUND', message: 'Membership not found' });
    if (membership.status !== 'active') {
      throw new ConvexError({ code: 'INVALID_STATE', message: 'Can only freeze active memberships' });
    }
    if (days <= 0 || days > 60) {
      throw new ConvexError({ code: 'INVALID_DAYS', message: 'Days must be between 1 and 60' });
    }
    const now = Date.now();
    const newFreezes = [
      ...membership.freezes,
      { startDate: now, endDate: now + days * 24 * 60 * 60 * 1000, reason },
    ];
    const before = { status: membership.status, endDate: membership.endDate };
    await ctx.db.patch(membershipId, {
      status: 'frozen',
      freezes: newFreezes,
      endDate: membership.endDate + days * 24 * 60 * 60 * 1000,
    });
    await audit(ctx, {
      actorId: staff._id,
      action: 'membership.frozen',
      entityType: 'membership',
      entityId: membershipId,
      before,
      after: { days, reason, byAdmin: true },
    });
    return await ctx.db.get(membershipId);
  },
});

export const unfreezeAnyMembership = mutation({
  args: { membershipId: v.id('memberships') },
  handler: async (ctx, { membershipId }) => {
    const staff = await requireRole(ctx as any, STAFF_ROLES);
    const m = await ctx.db.get(membershipId);
    if (!m) throw new ConvexError({ code: 'NOT_FOUND', message: 'Membership not found' });
    if (m.status !== 'frozen') return m;
    await ctx.db.patch(membershipId, { status: 'active' });
    await audit(ctx, {
      actorId: staff._id,
      action: 'membership.unfrozen',
      entityType: 'membership',
      entityId: membershipId,
      after: { byAdmin: true },
    });
    return await ctx.db.get(membershipId);
  },
});

export const cancelAnyMembership = mutation({
  args: { membershipId: v.id('memberships') },
  handler: async (ctx, { membershipId }) => {
    const staff = await requireRole(ctx as any, STAFF_ROLES);
    const m = await ctx.db.get(membershipId);
    if (!m) throw new ConvexError({ code: 'NOT_FOUND', message: 'Membership not found' });
    if (m.status === 'cancelled') return m;
    const before = { status: m.status };
    await ctx.db.patch(membershipId, { status: 'cancelled' });
    await audit(ctx, {
      actorId: staff._id,
      action: 'membership.cancelled',
      entityType: 'membership',
      entityId: membershipId,
      before,
      after: { status: 'cancelled', byAdmin: true },
    });
    return await ctx.db.get(membershipId);
  },
});

export const setPlanActive = mutation({
  args: { planId: v.id('membershipPlans'), isActive: v.boolean() },
  handler: async (ctx, { planId, isActive }) => {
    const staff = await requireRole(ctx as any, STAFF_ROLES);
    const plan = await ctx.db.get(planId);
    if (!plan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Plan not found' });
    await ctx.db.patch(planId, { isActive });
    await audit(ctx, {
      actorId: staff._id,
      action: isActive ? 'plan.activated' : 'plan.deactivated',
      entityType: 'membershipPlan',
      entityId: planId,
    });
    return await ctx.db.get(planId);
  },
});

export const createPlan = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    durationDays: v.number(),
    priceCents: v.number(),
    currency: v.string(),
    features: v.array(v.string()),
    isTrial: v.optional(v.boolean()),
    trialDays: v.optional(v.number()),
    maxClassesPerMonth: v.number(),
    maxPTSessions: v.number(),
  },
  handler: async (ctx, args) => {
    const staff = await requireRole(ctx as any, STAFF_ROLES);
    if (args.priceCents < 0 || args.durationDays <= 0) {
      throw new ConvexError({ code: 'INVALID_PLAN', message: 'Price and duration must be positive' });
    }
    const id = await ctx.db.insert('membershipPlans', {
      name: args.name,
      description: args.description,
      durationDays: args.durationDays,
      priceCents: args.priceCents,
      currency: args.currency,
      features: args.features,
      isActive: true,
      isTrial: args.isTrial ?? false,
      trialDays: args.trialDays ?? 0,
      maxClassesPerMonth: args.maxClassesPerMonth,
      maxPTSessions: args.maxPTSessions,
    });
    await audit(ctx, {
      actorId: staff._id,
      action: 'plan.created',
      entityType: 'membershipPlan',
      entityId: id,
      after: { name: args.name },
    });
    return id;
  },
});
