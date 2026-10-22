/**
 * Queenix Gym — Membership queries
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireRole, requireUser } from '../_helpers';

export const getCurrentMembership = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const membership = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.or(q.eq(q.field('status'), 'active'), q.eq(q.field('status'), 'trial')))
      .first();
    if (!membership) return null;
    const plan = await ctx.db.get(membership.planId);
    return { ...membership, plan };
  },
});

export const getAvailablePlans = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('membershipPlans')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .collect();
  },
});

export const getMembershipHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(limit);
  },
});

// ============================================================
// Owner KPIs
// ============================================================

/**
 * Aggregate KPIs for the owner dashboard: active members, today's
 * revenue, today's check-ins, current occupancy.
 */
export const getOwnerKPIs = query({
  args: {},
  handler: async (ctx) => {
    // Gym-wide revenue/occupancy: web /dashboard (finance, ops) + mobile owner app.
    await requireRole(ctx, ['finance', 'operations']);

    // Active members
    const activeMemberships = await ctx.db
      .query('memberships')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();
    const activeMemberCount = new Set(activeMemberships.map((m) => m.userId)).size;

    // Today window
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    // Today's revenue (succeeded payments created today)
    const todayPayments = await ctx.db
      .query('payments')
      .withIndex('by_status', (q) => q.eq('status', 'succeeded'))
      .collect();
    const todaysPayments = todayPayments.filter(
      (p) => p.createdAt >= startOfDay && p.createdAt < endOfDay
    );
    const todaysRevenueCents = todaysPayments.reduce(
      (sum, p) => sum + p.amountCents,
      0
    );

    // Today's check-ins
    const todaysCheckIns = await ctx.db
      .query('accessEvents')
      .withIndex('by_timestamp', (q) => q.gte('timestamp', startOfDay))
      .filter((q) =>
        q.and(q.lt(q.field('timestamp'), endOfDay), q.eq(q.field('direction'), 'in'))
      )
      .collect();

    // Current occupancy — most recent snapshot
    const latestSnapshot = await ctx.db
      .query('occupancySnapshots')
      .order('desc')
      .first();

    const currentOccupancy = latestSnapshot?.count ?? 0;

    return {
      activeMemberCount,
      todaysRevenueCents,
      todaysCheckInCount: todaysCheckIns.length,
      currentOccupancy,
    };
  },
});

/**
 * Number of pending approval items for the owner inbox badge.
 */
export const getPendingApprovalsCount = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ['finance', 'operations']);
    const pending = await ctx.db
      .query('approvals')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect();
    return pending.length;
  },
});

/**
 * All approval requests, optionally filtered by status.
 * Default returns pending only, ordered by createdAt desc.
 */
export const getApprovals = query({
  args: {
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('approved'),
        v.literal('denied'),
        v.literal('cancelled')
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status = 'pending', limit = 100 }) => {
    // Inbox for web /approvals (finance, ops) + mobile owner app.
    await requireRole(ctx, ['finance', 'operations']);
    const items = await ctx.db
      .query('approvals')
      .withIndex('by_status', (q) => q.eq('status', status))
      .order('desc')
      .take(limit);
    // Enrich with the requestor's display fields only (no phone/roles/auth ids).
    const enriched = await Promise.all(
      items.map(async (a) => {
        const r = await ctx.db.get(a.requestorId);
        return { ...a, requestor: r ? { _id: r._id, fullName: r.fullName, email: r.email } : null };
      })
    );
    return enriched;
  },
});

/**
 * Get the current user's payment history, most recent first.
 * Returns raw payment rows from the `payments` table; the UI maps
 * status codes (succeeded / pending / failed / refunded / cancelled)
 * to display variants.
 */
export const getMyPayments = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('payments')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(limit);
  },
});
