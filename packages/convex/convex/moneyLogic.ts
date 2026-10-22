/**
 * Queenix Gym — pure money helpers (no Convex ctx), shared by
 * mutations/payments.ts, queries/finance*.ts and tests/unit/money.test.ts.
 */

/** UAE VAT. Plan and venue prices are VAT-inclusive. */
export const UAE_VAT_RATE = 0.05;

export function vatRateFor(currency: string): number {
  return currency.toUpperCase() === 'AED' ? UAE_VAT_RATE : 0;
}

/**
 * Split a VAT-inclusive charged total into net + VAT. The total is never
 * changed: the receipt total must equal what the customer was charged.
 * Integer maths on basis points so 5/105 has no float drift.
 */
export function splitVatInclusive(totalCents: number, rate: number) {
  const bp = Math.round(rate * 10000);
  const vatCents = Math.round((totalCents * bp) / (10000 + bp));
  return { subtotalCents: totalCents - vatCents, vatCents, totalCents };
}

/**
 * Why a provider-confirmed charge must NOT be honoured, or null when it
 * matches the server-priced payment record (and, for plans, the plan price).
 */
export function paidAmountMismatch(p: {
  receivedCents: number;
  receivedCurrency: string;
  expectedCents: number;
  expectedCurrency: string;
  planPriceCents?: number;
}): string | null {
  if (p.receivedCurrency.toUpperCase() !== p.expectedCurrency.toUpperCase()) {
    return `currency ${p.receivedCurrency} does not match ${p.expectedCurrency}`;
  }
  if (p.receivedCents !== p.expectedCents) {
    return `charged ${p.receivedCents} but payment is ${p.expectedCents}`;
  }
  // ponytail: rejects a checkout started before a plan price rise; snapshot the price on the payment if that bites.
  if (p.planPriceCents !== undefined && p.expectedCents < p.planPriceCents) {
    return `payment ${p.expectedCents} is below plan price ${p.planPriceCents}`;
  }
  return null;
}

/** A double-tap within this window reuses the pending checkout instead of creating another. */
export const CHECKOUT_REUSE_MS = 15 * 60 * 1000;

/** The user's recent pending checkout for this plan at its current price, if any. */
export function findReusableCheckout<
  P extends { status: string; type: string; metadata?: any; amountCents: number; currency: string; createdAt: number },
>(recent: P[], plan: { _id: string; priceCents: number; currency: string }, now: number): P | undefined {
  return recent.find(
    (p) =>
      p.status === 'pending' &&
      p.type === 'membership' &&
      p.metadata?.planId === plan._id &&
      p.amountCents === plan.priceCents &&
      p.currency === plan.currency &&
      p.createdAt > now - CHECKOUT_REUSE_MS
  );
}

/** Cancelled payouts never left the business: exclude them from every total. */
export function countsAsPayout(p: { status: string }): boolean {
  return p.status !== 'cancelled';
}

type PnlPayment = { createdAt: number; status: string; type: string; amountCents: number; refundedAmountCents?: number };
type PnlPayout = { createdAt: number; status: string; amountCents: number };
type PnlJournal = { entryDate: number; kind: 'income' | 'expense'; amountCents: number };

/** P&L for [start, end]: net = gross − refunds − payouts + manual income − manual expenses. */
export function summarizePnl(
  rows: { payments: PnlPayment[]; payouts: PnlPayout[]; journal: PnlJournal[] },
  start: number,
  end: number
) {
  let grossCents = 0;
  let refundedCents = 0;
  let succeededCount = 0;
  let refundedCount = 0;
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const p of rows.payments) {
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
  const payouts = rows.payouts.filter((p) => countsAsPayout(p) && p.createdAt >= start && p.createdAt <= end);
  const payoutsCents = payouts.reduce((sum, p) => sum + p.amountCents, 0);
  const journal = rows.journal.filter((e) => e.entryDate >= start && e.entryDate <= end);
  const manualIncomeCents = journal.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amountCents, 0);
  const manualExpenseCents = journal.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amountCents, 0);
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
    payoutsCount: payouts.length,
    journalCount: journal.length,
    byType,
    byStatus,
  };
}
