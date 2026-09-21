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

    // Promote the earliest waitlisted member into the freed spot.
    if (booking.status === 'confirmed') {
      const waiting = await ctx.db
        .query('bookings')
        .withIndex('by_classInstance', (q) => q.eq('classInstanceId', booking.classInstanceId))
        .collect();
      const next = waiting
        .filter((b) => b.status === 'waitlisted')
        .sort((a, b) => a.bookedAt - b.bookedAt)[0];
      if (next) {
        await ctx.db.patch(next._id, { status: 'confirmed' });
        const fresh = await ctx.db.get(booking.classInstanceId);
        if (fresh) {
          await ctx.db.patch(booking.classInstanceId, {
            bookedCount: fresh.bookedCount + 1,
            waitlistCount: Math.max(0, (fresh.waitlistCount ?? 1) - 1),
          });
        }
        await ctx.db.insert('notifications', {
          userId: next.userId,
          title: 'You are off the waitlist',
          body: 'A spot opened up — your class booking is confirmed.',
          type: 'booking',
          read: false,
          data: { bookingId: next._id, classInstanceId: booking.classInstanceId },
          createdAt: Date.now(),
        });
      }
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

/**
 * Join the waitlist of a full class. No-ops to the existing record when
 * the member already holds a live booking or waitlist slot.
 */
export const joinWaitlist = mutation({
  args: {
    classInstanceId: v.id('classInstances'),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, { classInstanceId, idempotencyKey }) => {
    const user = await requireUser(ctx);

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
    if (classInstance.bookedCount < classInstance.capacity) {
      throw new ConvexError({ code: 'HAS_SPOTS', message: 'Spots are open — book directly' });
    }
    const mine = await ctx.db
      .query('bookings')
      .withIndex('by_classInstance', (q) => q.eq('classInstanceId', classInstanceId))
      .collect();
    const live = mine.find(
      (b) => String(b.userId) === String(user._id) && b.status !== 'cancelled'
    );
    if (live) return live;

    const bookingId = await ctx.db.insert('bookings', {
      userId: user._id,
      classInstanceId,
      status: 'waitlisted',
      bookedAt: Date.now(),
      idempotencyKey,
    });
    await ctx.db.patch(classInstanceId, {
      waitlistCount: (classInstance.waitlistCount ?? 0) + 1,
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'class.waitlisted',
      entityType: 'booking',
      entityId: bookingId,
      after: { bookingId },
    });
    return await ctx.db.get(bookingId);
  },
});

/**
 * Leave a waitlist slot (own only).
 */
export const leaveWaitlist = mutation({
  args: { bookingId: v.id('bookings') },
  handler: async (ctx, { bookingId }) => {
    const user = await requireUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new ConvexError({ code: 'NOT_FOUND', message: 'Booking not found' });
    if (booking.userId !== user._id) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Cannot change another user booking' });
    }
    if (booking.status !== 'waitlisted') {
      throw new ConvexError({ code: 'INVALID_STATE', message: 'Only waitlisted bookings can be left' });
    }
    await ctx.db.patch(bookingId, { status: 'cancelled', cancelledAt: Date.now() });
    const classInstance = await ctx.db.get(booking.classInstanceId);
    if (classInstance && (classInstance.waitlistCount ?? 0) > 0) {
      await ctx.db.patch(booking.classInstanceId, {
        waitlistCount: classInstance.waitlistCount - 1,
      });
    }
    return await ctx.db.get(bookingId);
  },
});
