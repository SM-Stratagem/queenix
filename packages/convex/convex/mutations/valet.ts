/**
 * Queenix Gym — Valet mutations
 * reserve { plate, etaMin }, cancel, checkIn, handOver / complete.
 * Slot counting enforced via VALET_CAPACITY.
 */

import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { mutation } from '../_generated/server';
import { audit, requireRole, requireUser } from '../_helpers';

const VALET_CAPACITY = 20;
const ACTIVE = ['reserved', 'checked_in'] as const;

async function activeCount(ctx: any): Promise<number> {
  let n = 0;
  for (const s of ACTIVE) {
    const rows = await ctx.db
      .query('valetReservations')
      .withIndex('by_status', (q: any) => q.eq('status', s))
      .collect();
    n += rows.length;
  }
  return n;
}

export const reserve = mutation({
  args: { plate: v.string(), etaMin: v.number() },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [
      'member',
      'trainer',
      'operations',
      'owner',
      'admin',
      'superadmin',
      'salon',
      'coffee',
    ] as any);
    const plate = args.plate.trim().toUpperCase();
    if (plate.length < 2 || plate.length > 12) {
      throw new ConvexError({ code: 'INVALID_PLATE', message: 'Plate must be 2–12 characters' });
    }
    if (!Number.isFinite(args.etaMin) || args.etaMin < 2 || args.etaMin > 180) {
      throw new ConvexError({ code: 'INVALID_ETA', message: 'ETA must be 2–180 minutes' });
    }
    const existing = await ctx.db
      .query('valetReservations')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect();
    if (existing.some((r: any) => r.status === 'reserved' || r.status === 'checked_in')) {
      throw new ConvexError({ code: 'ALREADY_ACTIVE', message: 'You already have an active valet reservation' });
    }
    if ((await activeCount(ctx)) >= VALET_CAPACITY) {
      throw new ConvexError({ code: 'VALET_FULL', message: 'Valet is full right now' });
    }
    const now = Date.now();
    const id = await ctx.db.insert('valetReservations', {
      userId: user._id,
      plate,
      status: 'reserved',
      etaMin: Math.round(args.etaMin),
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'valet.reserved',
      entityType: 'valetReservation',
      entityId: id,
      after: { plate },
    });
    return await ctx.db.get(id);
  },
});

export const cancel = mutation({
  args: { reservationId: v.id('valetReservations') },
  handler: async (ctx, { reservationId }) => {
    const user = await requireUser(ctx);
    const r = await ctx.db.get(reservationId);
    if (!r) throw new ConvexError({ code: 'NOT_FOUND', message: 'Reservation not found' });
    const roles: string[] = (user as any).roles ?? [];
    const isOwner = String(r.userId) === String(user._id);
    const isOps = roles.some((x) => ['operations', 'owner', 'admin', 'superadmin'].includes(x));
    if (!isOwner && !isOps) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Cannot cancel this reservation' });
    }
    if (r.status === 'completed' || r.status === 'cancelled') return r;
    const before = { ...r };
    await ctx.db.patch(reservationId, {
      status: 'cancelled',
      updatedAt: Date.now(),
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'valet.cancelled',
      entityType: 'valetReservation',
      entityId: reservationId,
      before,
      after: { status: 'cancelled' },
    });
    return await ctx.db.get(reservationId);
  },
});

export const checkIn = mutation({
  args: { reservationId: v.id('valetReservations') },
  handler: async (ctx, { reservationId }) => {
    const user = await requireRole(ctx, ['operations', 'owner', 'admin', 'superadmin'] as any);
    const r = await ctx.db.get(reservationId);
    if (!r) throw new ConvexError({ code: 'NOT_FOUND', message: 'Reservation not found' });
    if (r.status !== 'reserved') {
      throw new ConvexError({ code: 'INVALID_STATUS', message: 'Only reserved cars can be checked in' });
    }
    const before = { ...r };
    await ctx.db.patch(reservationId, {
      status: 'checked_in',
      checkedInAt: Date.now(),
      checkedInBy: user._id,
      updatedAt: Date.now(),
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'valet.checkedIn',
      entityType: 'valetReservation',
      entityId: reservationId,
      before,
      after: { status: 'checked_in' },
    });
    return await ctx.db.get(reservationId);
  },
});

async function completeHandler(ctx: any, reservationId: any, actorId: string) {
  const r = await ctx.db.get(reservationId);
  if (!r) throw new ConvexError({ code: 'NOT_FOUND', message: 'Reservation not found' });
  if (r.status !== 'checked_in') {
    throw new ConvexError({ code: 'INVALID_STATUS', message: 'Only checked-in cars can be handed over' });
  }
  const before = { ...r };
  await ctx.db.patch(reservationId, {
    status: 'completed',
    completedAt: Date.now(),
    updatedAt: Date.now(),
  });
  await audit(ctx, {
    actorId,
    action: 'valet.completed',
    entityType: 'valetReservation',
    entityId: reservationId,
    before,
    after: { status: 'completed' },
  });
  return await ctx.db.get(reservationId);
}

/** Hand the car back to the member (ops). */
export const handOver = mutation({
  args: { reservationId: v.id('valetReservations') },
  handler: async (ctx, { reservationId }) => {
    const user = await requireRole(ctx, ['operations', 'owner', 'admin', 'superadmin'] as any);
    return await completeHandler(ctx, reservationId, user._id);
  },
});

/** Alias of handOver for queue UIs that say "Complete". */
export const complete = mutation({
  args: { reservationId: v.id('valetReservations') },
  handler: async (ctx, { reservationId }) => {
    const user = await requireRole(ctx, ['operations', 'owner', 'admin', 'superadmin'] as any);
    return await completeHandler(ctx, reservationId, user._id);
  },
});
