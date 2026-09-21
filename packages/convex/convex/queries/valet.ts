/**
 * Queenix Gym — Valet queries
 * Member: my reservations. Ops: live queue by status + slot counts.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireRole, requireUser } from '../_helpers';

const valetStatus = v.union(
  v.literal('reserved'),
  v.literal('checked_in'),
  v.literal('completed'),
  v.literal('cancelled')
);

/** Current member's valet reservations, newest first. */
export const myReservations = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('valetReservations')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect();
  },
});

/** Ops queue, optionally filtered by status. */
export const opsQueue = query({
  args: { status: v.optional(valetStatus) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ['operations', 'owner', 'admin', 'superadmin'] as any);
    if (args.status) {
      return await ctx.db
        .query('valetReservations')
        .withIndex('by_status', (q) => q.eq('status', args.status as any))
        .order('desc')
        .collect();
    }
    return await ctx.db.query('valetReservations').order('desc').collect();
  },
});

/** Active slot counts for capacity display. */
export const slotCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ['operations', 'owner', 'admin', 'superadmin'] as any);
    const [reserved, checkedIn] = await Promise.all([
      ctx.db
        .query('valetReservations')
        .withIndex('by_status', (q) => q.eq('status', 'reserved'))
        .collect(),
      ctx.db
        .query('valetReservations')
        .withIndex('by_status', (q) => q.eq('status', 'checked_in'))
        .collect(),
    ]);
    return {
      reserved: reserved.length,
      checkedIn: checkedIn.length,
      active: reserved.length + checkedIn.length,
    };
  },
});
