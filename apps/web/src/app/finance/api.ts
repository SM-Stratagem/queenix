'use client';

/**
 * Finance function refs.
 *
 * The committed Convex `_generated/api.d.ts` is refreshed by `npx convex dev`
 * codegen on deploy; until then these refs are resolved through `any` casts
 * so the finance pages typecheck against the stale snapshot. Every path
 * below names a REAL deployed function:
 *  - queries/finance.ts: getLedger, listRefunds, listPayouts,
 *    listFinanceAudit, getDailyClose
 *  - queries/financeReports.ts (new): getRevenueAnalytics, getProfitAndLoss,
 *    getRetentionProjection
 *  - queries/financeAuditLog.ts (new): listAuditEvents
 *  - mutations/finance.ts: recordPayout, decidePayout, voidPayment,
 *    appendFinanceAudit, recordJournalEntry
 *  - queries/finance.ts: listJournalEntries
 */

import { api } from '@queenix/convex';

const q = api.queries as any;
const m = api.mutations as any;

export const financeRefs = {
  getLedger: q.finance.getLedger,
  listRefunds: q.finance.listRefunds,
  listPayouts: q.finance.listPayouts,
  listFinanceAudit: q.finance.listFinanceAudit,
  getDailyClose: q.finance.getDailyClose,
  getRevenueAnalytics: q.financeReports.getRevenueAnalytics,
  getProfitAndLoss: q.financeReports.getProfitAndLoss,
  getRetentionProjection: q.financeReports.getRetentionProjection,
  listAuditEvents: q.financeAuditLog.listAuditEvents,
  recordPayout: m.finance.recordPayout,
  decidePayout: m.finance.decidePayout,
  voidPayment: m.finance.voidPayment,
  appendFinanceAudit: m.finance.appendFinanceAudit,
  recordJournalEntry: m.finance.recordJournalEntry,
  listJournalEntries: q.finance.listJournalEntries,
};
