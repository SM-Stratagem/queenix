/**
 * Queenix Gym — Trainer mutations (PT sessions).
 *
 * Trainers schedule sessions with members (which is also how a member
 * becomes their client) and run their day by completing / cancelling /
 * marking no-shows. Earnings rows are created by the payments flow, not
 * here — completing a session never invents money.
 */

import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireRole } from '../_helpers';

const TRAINER = ['trainer'] as any;

/**
 * Schedule a PT session with a member. The member becomes the trainer's
 * client by virtue of having sessions together.
 */
export const scheduleSession = mutation({
  args: {
    memberId: v.id('users'),
    scheduledAt: v.number(),
    durationMinutes: v.number(),
    priceCents: v.number(),
    currency: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trainer = await requireRole(ctx, TRAINER);
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Member not found' });
    }
    if ((member as any).activeRole !== 'member') {
      throw new ConvexError({ code: 'NOT_A_MEMBER', message: 'Sessions can only be scheduled with members' });
    }
    if (!Number.isFinite(args.scheduledAt) || args.scheduledAt < Date.now() - 60 * 1000) {
      throw new ConvexError({ code: 'INVALID_TIME', message: 'Session must be scheduled in the future' });
    }
    if (!Number.isFinite(args.durationMinutes) || args.durationMinutes <= 0 || args.durationMinutes > 480) {
      throw new ConvexError({ code: 'INVALID_DURATION', message: 'Duration must be 1–480 minutes' });
    }
    if (!Number.isFinite(args.priceCents) || args.priceCents < 0) {
      throw new ConvexError({ code: 'INVALID_PRICE', message: 'Price cannot be negative' });
    }
    const id = await ctx.db.insert('ptSessions', {
      trainerId: trainer._id,
      memberId: args.memberId,
      scheduledAt: Math.round(args.scheduledAt),
      durationMinutes: Math.round(args.durationMinutes),
      status: 'scheduled',
      notes: args.notes?.trim() || undefined,
      exercises: [],
      priceCents: Math.round(args.priceCents),
      currency: args.currency ?? 'AED',
    });
    return await ctx.db.get(id);
  },
});

/**
 * Run the day: complete, cancel, or mark no-show on an owned session.
 * Only `scheduled` sessions can transition.
 */
export const updateSessionStatus = mutation({
  args: {
    sessionId: v.id('ptSessions'),
    status: v.union(
      v.literal('completed'),
      v.literal('cancelled'),
      v.literal('no_show')
    ),
  },
  handler: async (ctx, { sessionId, status }) => {
    const trainer = await requireRole(ctx, TRAINER);
    const session = await ctx.db.get(sessionId);
    if (!session) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Session not found' });
    }
    if (String((session as any).trainerId) !== String(trainer._id)) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Only the owning trainer can update this session' });
    }
    if ((session as any).status !== 'scheduled') {
      throw new ConvexError({ code: 'INVALID_STATE', message: 'Only scheduled sessions can be updated' });
    }
    await ctx.db.patch(sessionId, { status });
    return await ctx.db.get(sessionId);
  },
});
