/**
 * Queenix Gym — Finance audit queries (staff only: admin / superadmin / owner).
 *
 * Requires new tables (see SCHEMA ADDS in delivery notes):
 *   payouts, financeVoids
 *
 * Ledger joins existing `payments` + `invoices` (refunds are payments with
 * status == 'refunded'; there is no separate refunds table yet).
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireRole } from '../_helpers';

const STAFF_ROLES = ['admin', 'superadmin', 'owner'] as any;

const paymentStatus = v.union(
  v.literal('pending'),
  v.literal('succeeded'),
  v.literal('failed'),
  v.literal('refunded'),
  v.literal('cancelled')
);

const paymentType = v.union(
  v.literal('membership'),
  v.literal('pt_package'),
  v.literal('event'),
  v.literal('other')
);

function dayRange(day: string): { start: number; end: number } {
  const start = new Date(`${day}T00:00:00`).getTime();
  const end = new Date(`${day}T23:59:59.999`).getTime();
  return { start, end };
}

/**
 * Ledger view: payments joined with their invoice + member, newest first.
 * Optional status/type/from/to filters. `limit` caps scanned rows.
 */
export const getLedger = query({
  args: {
    status: v.optional(paymentStatus),
    type: v.optional(paymentType),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, type, from, to, limit = 100 }) => {
    await requireRole(ctx, STAFF_ROLES);
    const payments = await ctx.db
      .query('payments')
      .order('desc')
      .take(Math.min(limit, 500));
    const rows = [];
    for (const p of payments) {
      if (status && p.status !== status) continue;
      if (type && p.type !== type) continue;
      if (from !== undefined && p.createdAt < from) continue;
      if (to !== undefined && p.createdAt > to) continue;
      const invoice = p.invoiceId ? await ctx.db.get(p.invoiceId) : null;
      const member = await ctx.db.get(p.userId);
      rows.push({
        ...p,
        invoiceNumber: invoice?.invoiceNumber ?? p.invoiceNumber ?? null,
        memberName: member?.fullName ?? null,
        memberEmail: member?.email ?? null,
      });
    }
    return rows;
  },
});

/**
 * Refund list: payments with status == 'refunded', newest first.
 */
export const listRefunds = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    await requireRole(ctx, STAFF_ROLES);
    const payments = await ctx.db
      .query('payments')
      .withIndex('by_status', (q) => q.eq('status', 'refunded'))
      .order('desc')
      .take(Math.min(limit, 500));
    const rows = [];
    for (const p of payments) {
      const member = await ctx.db.get(p.userId);
      rows.push({
        ...p,
        memberName: member?.fullName ?? null,
        memberEmail: member?.email ?? null,
      });
    }
    return rows;
  },
});

/**
 * Payouts list (trainer / partner payouts). Reads the NEW `payouts` table.
 */
export const listPayouts = query({
  args: {
    status: v.optional(
      v.union(v.literal('pending'), v.literal('paid'), v.literal('cancelled'))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit = 100 }) => {
    await requireRole(ctx, STAFF_ROLES);
    const all = await ctx.db
      .query('payouts')
      .order('desc')
      .take(Math.min(limit, 500));
    return status ? all.filter((p) => p.status === status) : all;
  },
});

/**
 * Audit trail for finance actions (payment.*, payout.*, invoice.*, refund.*).
 * Reads the existing `auditEvents` table.
 */
export const listFinanceAudit = query({
  args: {
    entityId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { entityId, limit = 100 }) => {
    await requireRole(ctx, STAFF_ROLES);
    const events = await ctx.db
      .query('auditEvents')
      .withIndex('by_timestamp')
      .order('desc')
      .take(Math.min(limit, 500));
    return events.filter((e) => {
      if (entityId && e.entityId !== entityId) return false;
      return (
        e.action.startsWith('payment.') ||
        e.action.startsWith('payout.') ||
        e.action.startsWith('invoice.') ||
        e.action.startsWith('finance.')
      );
    });
  },
});

/**
 * Daily-close summary for a calendar day (YYYY-MM-DD): gross succeeded,
 * refunded total, net, counts by status/type, and payouts issued that day.
 */
export const getDailyClose = query({
  args: { day: v.string() },
  handler: async (ctx, { day }) => {
    await requireRole(ctx, STAFF_ROLES);
    const { start, end } = dayRange(day);
    const payments = await ctx.db.query('payments').order('desc').take(1000);
    const inDay = payments.filter((p) => p.createdAt >= start && p.createdAt <= end);

    let grossCents = 0;
    let refundedCents = 0;
    let succeededCount = 0;
    let refundedCount = 0;
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const p of inDay) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
      byType[p.type] = (byType[p.type] ?? 0) + 1;
      if (p.status === 'succeeded') {
        grossCents += p.amountCents;
        succeededCount += 1;
      }
      if (p.status === 'refunded') {
        refundedCents += p.refundedAmountCents ?? p.amountCents;
        refundedCount += 1;
      }
    }

    const payouts = await ctx.db.query('payouts').order('desc').take(500);
    const dayPayouts = payouts.filter((p) => p.createdAt >= start && p.createdAt <= end);
    const payoutsCents = dayPayouts.reduce((sum, p) => sum + p.amountCents, 0);

    return {
      day,
      grossCents,
      refundedCents,
      netCents: grossCents - refundedCents,
      succeededCount,
      refundedCount,
      payoutsCents,
      payoutsCount: dayPayouts.length,
      byStatus,
      byType,
    };
  },
});

/**
 * Manual journal entries (bookkeeping), newest first, optional window.
 */
export const listJournalEntries = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    kind: v.optional(v.union(v.literal('income'), v.literal('expense'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { from, to, kind, limit = 200 }) => {
    await requireRole(ctx, STAFF_ROLES);
    const rows = await ctx.db
      .query('journalEntries')
      .withIndex('by_entryDate')
      .order('desc')
      .take(Math.min(limit, 500));
    return rows.filter(
      (e) =>
        (from === undefined || e.entryDate >= from) &&
        (to === undefined || e.entryDate <= to) &&
        (!kind || e.kind === kind)
    );
  },
});
