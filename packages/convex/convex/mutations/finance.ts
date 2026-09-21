/**
 * Queenix Gym — Finance mutations (staff only: admin / superadmin / owner).
 *
 * Writes to the NEW `payouts` / `financeVoids` tables (see SCHEMA ADDS)
 * and appends finance audit events to the existing `auditEvents` table.
 */

import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireRole, audit } from '../_helpers';

const STAFF_ROLES = ['admin', 'superadmin', 'owner'] as any;

/**
 * Record a trainer/partner payout. Status starts as `pending`;
 * a separate approval step (or bank run) marks it `paid`.
 */
export const recordPayout = mutation({
  args: {
    recipientId: v.optional(v.id('users')),
    recipientName: v.string(),
    amountCents: v.number(),
    currency: v.string(),
    method: v.union(
      v.literal('bank_transfer'),
      v.literal('cash'),
      v.literal('wallet')
    ),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireRole(ctx, STAFF_ROLES);
    if (args.amountCents <= 0) {
      throw new ConvexError({ code: 'INVALID_AMOUNT', message: 'Amount must be positive' });
    }
    const payoutId = await ctx.db.insert('payouts', {
      recipientId: args.recipientId,
      recipientName: args.recipientName,
      amountCents: args.amountCents,
      currency: args.currency,
      method: args.method,
      status: 'pending',
      reference: args.reference,
      notes: args.notes,
      createdBy: staff._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await audit(ctx, {
      actorId: staff._id,
      action: 'payout.recorded',
      entityType: 'payout',
      entityId: payoutId,
      after: {
        recipientName: args.recipientName,
        amountCents: args.amountCents,
        currency: args.currency,
        method: args.method,
      },
    });
    return await ctx.db.get(payoutId);
  },
});

/**
 * Record a manual bookkeeping entry (off-system income or expense).
 * Flows into P&L via getProfitAndLoss alongside payments and payouts.
 */
export const recordJournalEntry = mutation({
  args: {
    kind: v.union(v.literal('income'), v.literal('expense')),
    category: v.string(),
    amountCents: v.number(),
    currency: v.optional(v.string()),
    note: v.optional(v.string()),
    entryDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const staff = await requireRole(ctx, STAFF_ROLES);
    if (args.amountCents <= 0) {
      throw new ConvexError({ code: 'INVALID_AMOUNT', message: 'Amount must be positive' });
    }
    if (!args.category.trim()) {
      throw new ConvexError({ code: 'INVALID_CATEGORY', message: 'Category is required' });
    }
    const now = Date.now();
    const id = await ctx.db.insert('journalEntries', {
      entryDate: args.entryDate ?? now,
      kind: args.kind,
      category: args.category.trim(),
      amountCents: Math.round(args.amountCents),
      currency: args.currency ?? 'AED',
      note: args.note,
      createdBy: staff._id,
      createdAt: now,
    });
    await audit(ctx, {
      actorId: staff._id,
      action: 'journal.recorded',
      entityType: 'journalEntry',
      entityId: id,
      after: { kind: args.kind, category: args.category, amountCents: args.amountCents },
    });
    return await ctx.db.get(id);
  },
});

/**
 * Void a payment with a mandatory reason. Only `pending` / `failed`
 * payments can be voided — `succeeded` payments must go through the
 * refund flow (mutations/payments.ts `recordRefund`).
 */
export const voidPayment = mutation({
  args: {
    paymentId: v.id('payments'),
    reason: v.string(),
  },
  handler: async (ctx, { paymentId, reason }) => {
    const staff = await requireRole(ctx, STAFF_ROLES);
    if (!reason.trim()) {
      throw new ConvexError({ code: 'REASON_REQUIRED', message: 'A void reason is required' });
    }
    const payment = await ctx.db.get(paymentId);
    if (!payment) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Payment not found' });
    }
    if (payment.status !== 'pending' && payment.status !== 'failed') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'Only pending or failed payments can be voided; refund succeeded ones instead',
      });
    }
    const before = { status: payment.status };
    await ctx.db.patch(paymentId, { status: 'cancelled', updatedAt: Date.now() });
    const voidId = await ctx.db.insert('financeVoids', {
      paymentId,
      reason: reason.trim(),
      voidedBy: staff._id,
      createdAt: Date.now(),
    });
    await audit(ctx, {
      actorId: staff._id,
      action: 'finance.voided',
      entityType: 'payment',
      entityId: paymentId,
      before,
      after: { status: 'cancelled', reason: reason.trim(), voidId },
    });
    return await ctx.db.get(paymentId);
  },
});

/**
 * Decide a payout: mark a `pending` payout as `paid` (money sent) or
 * `cancelled`. Without this, recorded payouts stay pending forever.
 */
export const decidePayout = mutation({
  args: {
    payoutId: v.id('payouts'),
    decision: v.union(v.literal('paid'), v.literal('cancelled')),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, { payoutId, decision, reference }) => {
    const staff = await requireRole(ctx, STAFF_ROLES);
    const payout = await ctx.db.get(payoutId);
    if (!payout) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Payout not found' });
    }
    if (payout.status !== 'pending') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'Only pending payouts can be decided',
      });
    }
    const before = { status: payout.status };
    await ctx.db.patch(payoutId, {
      status: decision,
      reference: reference?.trim() || payout.reference,
      updatedAt: Date.now(),
    });
    await audit(ctx, {
      actorId: staff._id,
      action: decision === 'paid' ? 'payout.paid' : 'payout.cancelled',
      entityType: 'payout',
      entityId: payoutId,
      before,
      after: { status: decision, reference: reference?.trim() ?? null },
    });
    return await ctx.db.get(payoutId);
  },
});

/**
 * Append a free-form finance audit event (daily-close sign-off,
 * manual adjustments, reconciliation notes).
 */
export const appendFinanceAudit = mutation({
  args: {
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const staff = await requireRole(ctx, STAFF_ROLES);
    if (!args.action.trim()) {
      throw new ConvexError({ code: 'ACTION_REQUIRED', message: 'An action label is required' });
    }
    await audit(ctx, {
      actorId: staff._id,
      action: args.action.trim(),
      entityType: args.entityType,
      entityId: args.entityId,
      before: args.before,
      after: args.after,
    });
    return { ok: true as const };
  },
});
