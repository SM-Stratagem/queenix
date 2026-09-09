/**
 * Queenix Gym — Booking mutations
 */

import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireUser, audit } from '../_helpers';
import { ConvexError } from 'convex/values';

export const bookClass = mutation({
  args: {
    classInstanceId: v.id('classInstances'),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, { classInstanceId, idempotencyKey }) => {
    const user = await requireUser(ctx);

    // Idempotency check
    const existing = await ctx.db
      .query('bookings')
      .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', idempotencyKey))
      .first();
    if (existing) return existing;

    const classInstance = await ctx.db.get(classInstanceId);
    if (!classInstance) throw new ConvexError({ code: 'NOT_FOUND', message: 'Class not found' });
    if (classInstance.status !== 'scheduled') {
      throw new ConvexError({ code: 'INVALID_STATE', message: 'Class is not bookable' });
    }
    if (classInstance.bookedCount >= classInstance.capacity) {
      throw new ConvexError({ code: 'CAPACITY_FULL', message: 'Class is full' });
    }

    // Atomic capacity reservation
    await ctx.db.patch(classInstanceId, {
      bookedCount: classInstance.bookedCount + 1,
    });

    const bookingId = await ctx.db.insert('bookings', {
      userId: user._id,
      classInstanceId,
      status: 'confirmed',
      bookedAt: Date.now(),
      idempotencyKey,
    });

    await audit(ctx, {
      actorId: user._id,
      action: 'class.booked',
      entityType: 'classInstance',
      entityId: classInstanceId,
      after: { bookingId },
    });

    return await ctx.db.get(bookingId);
  },
});

export const cancelBooking = mutation({
  args: { bookingId: v.id('bookings') },
  handler: async (ctx, { bookingId }) => {
    const user = await requireUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new ConvexError({ code: 'NOT_FOUND', message: 'Booking not found' });
    if (booking.userId !== user._id) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Cannot cancel another user booking' });
    }
    if (booking.status === 'cancelled') return booking;

    const before = { ...booking };
    await ctx.db.patch(bookingId, {
      status: 'cancelled',
      cancelledAt: Date.now(),
    });

    // Decrement class capacity
    const classInstance = await ctx.db.get(booking.classInstanceId);
    if (classInstance && classInstance.bookedCount > 0) {
      await ctx.db.patch(booking.classInstanceId, {
        bookedCount: classInstance.bookedCount - 1,
      });
    }

    await audit(ctx, {
      actorId: user._id,
      action: 'class.cancelled',
      entityType: 'booking',
      entityId: bookingId,
      before,
      after: { status: 'cancelled' },
    });

    return await ctx.db.get(bookingId);
  },
});
