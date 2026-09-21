/**
 * Queenix Gym — Finance reporting queries (staff only: admin / superadmin / owner).
 *
 * Read-only aggregates over the EXISTING `payments`, `payouts`, `memberships`,
 * and `membershipPlans` tables. No schema changes required.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireRole } from '../_helpers';

const STAFF_ROLES = ['admin', 'superadmin', 'owner'] as any;

function monthKey(ts: number): string {
  const d = new Date(ts);
  const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return m;
}

function monthStart(month: string): number {
  return new Date(`${month}-01T00:00:00`).getTime();
}

function lastNMonths(n: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/**
 * Per-month revenue buckets for the last `monthsBack` calendar months
 * (default 6, max 24): gross succeeded, refunded, net, and counts.
 */
export const getRevenueAnalytics = query({
  args: { monthsBack: v.optional(v.number()) },
  handler: async (ctx, { monthsBack = 6 }) => {
    await requireRole(ctx, STAFF_ROLES);
    const n = Math.min(Math.max(monthsBack, 1), 24);
    const months = lastNMonths(n);
    const payments = await ctx.db.query('payments').order('desc').take(2000);
    return months.map((month) => {
      const start = monthStart(month);
      const next = new Date(new Date(`${month}-01T00:00:00`).setMonth(new Date(`${month}-01T00:00:00`).getMonth() + 1)).getTime();
      let grossCents = 0;
      let refundedCents = 0;
      let succeededCount = 0;
      let refundedCount = 0;
      const byType: Record<string, number> = {};
      for (const p of payments) {
        if (p.createdAt < start || p.createdAt >= next) continue;
        if (p.status === 'succeeded') {
          grossCents += p.amountCents;
          succeededCount += 1;
          byType[p.type] = (byType[p.type] ?? 0) + p.amountCents;
        }
        if (p.status === 'refunded') {
          refundedCents += p.refundedAmountCents ?? p.amountCents;
          refundedCount += 1;
        }
      }
      return {
        month,
        grossCents,
        refundedCents,
        netCents: grossCents - refundedCents,
        succeededCount,
        refundedCount,
        byType,
      };
    });
  },
});

/**
 * Profit & loss summary for an explicit window [from, to] (ms timestamps).
 * Net = gross succeeded − refunded − payouts issued in-window.
 */
export const getProfitAndLoss = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { from, to }) => {
    await requireRole(ctx, STAFF_ROLES);
    const start = from ?? 0;
    const end = to ?? Date.now();
    const payments = await ctx.db.query('payments').order('desc').take(2000);
    let grossCents = 0;
    let refundedCents = 0;
    let succeededCount = 0;
    let refundedCount = 0;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const p of payments) {
      if (p.createdAt < start || p.createdAt > end) continue;
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
      if (p.status === 'succeeded') {
        grossCents += p.amountCents;
        succeededCount += 1;
        byType[p.type] = (byType[p.type] ?? 0) + p.amountCents;
      }
      if (p.status === 'refunded') {
        refundedCents += p.refundedAmountCents ?? p.amountCents;
        refundedCount += 1;
      }
    }
    const payouts = await ctx.db.query('payouts').order('desc').take(1000);
    const inWindow = payouts.filter((p) => p.createdAt >= start && p.createdAt <= end);
    const payoutsCents = inWindow.reduce((sum, p) => sum + p.amountCents, 0);
    const journal = await ctx.db.query('journalEntries').order('desc').take(1000);
    const journalInWindow = journal.filter((e) => e.entryDate >= start && e.entryDate <= end);
    const manualIncomeCents = journalInWindow
      .filter((e) => e.kind === 'income')
      .reduce((sum, e) => sum + e.amountCents, 0);
    const manualExpenseCents = journalInWindow
      .filter((e) => e.kind === 'expense')
      .reduce((sum, e) => sum + e.amountCents, 0);
    return {
      from: start,
      to: end,
      grossCents,
      refundedCents,
      payoutsCents,
      manualIncomeCents,
      manualExpenseCents,
      netCents: grossCents - refundedCents - payoutsCents + manualIncomeCents - manualExpenseCents,
      succeededCount,
      refundedCount,
      payoutsCount: inWindow.length,
      journalCount: journalInWindow.length,
      byType,
      byStatus,
    };
  },
});

/**
 * Retention / renewal projection from live memberships:
 * active + trial counts, expiring-soon buckets (30/60/90d) valued at the
 * member's plan price, auto-renew split, and status mix.
 */
export const getRetentionProjection = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, STAFF_ROLES);
    const now = Date.now();
    const DAY = 24 * 3600 * 1000;
    const memberships = await ctx.db.query('memberships').collect();
    const byStatus: Record<string, number> = {};
    let activeCount = 0;
    let trialCount = 0;
    let autoRenewCount = 0;
    const buckets = [
      { label: 'next_30d', until: now + 30 * DAY },
      { label: 'next_60d', until: now + 60 * DAY },
      { label: 'next_90d', until: now + 90 * DAY },
    ];
    const expiring: Record<string, { count: number; projectedCents: number }> = {
      next_30d: { count: 0, projectedCents: 0 },
      next_60d: { count: 0, projectedCents: 0 },
      next_90d: { count: 0, projectedCents: 0 },
    };
    for (const m of memberships) {
      byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;
      if (m.status === 'active') activeCount += 1;
      if (m.status === 'trial') trialCount += 1;
      if ((m.status === 'active' || m.status === 'trial') && m.autoRenew) {
        autoRenewCount += 1;
      }
      if (m.status !== 'active' && m.status !== 'trial') continue;
      if (m.endDate < now) continue;
      const plan = await ctx.db.get(m.planId);
      const price = plan?.priceCents ?? 0;
      for (const b of buckets) {
        if (m.endDate <= b.until) {
          expiring[b.label]!.count += 1;
          expiring[b.label]!.projectedCents += price;
          break;
        }
      }
    }
    return {
      activeCount,
      trialCount,
      autoRenewCount,
      byStatus,
      expiring,
    };
  },
});
