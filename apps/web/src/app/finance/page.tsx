'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { AdminShell } from '@/components/admin/AdminShell';
import { RequireAuth } from '@/components/RequireAuth';
import { OverviewCards, formatAed } from '../../components/finance/OverviewCards';
import {
  TransactionsTable,
  type LedgerRow,
} from '../../components/finance/TransactionsTable';
import { RefundsTable, type RefundRow } from '../../components/finance/RefundsTable';
import { AuditTrail, type AuditRow } from '../../components/finance/AuditTrail';
import { downloadCsv } from '../../components/finance/CsvExport';
import { parseCsv, toJournalDrafts, type JournalDraft } from '../../components/finance/CsvImport';
import { financeRefs } from './api';

const STATUS_OPTIONS = ['all', 'pending', 'succeeded', 'failed', 'refunded', 'cancelled'];
const TYPE_OPTIONS = ['all', 'membership', 'pt_package', 'event', 'other'];

const INCOME_CATEGORIES = ['Membership dues', 'PT packages', 'Events', 'Café', 'Salon', 'Other income'];
const EXPENSE_CATEGORIES = ['Payroll', 'Rent', 'Utilities', 'Supplies', 'Marketing', 'Maintenance', 'Other expense'];

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(month: string): { from: number; to: number } {
  const [y, m] = month.split('-').map(Number);
  const from = new Date(y || 1970, (m || 1) - 1, 1).getTime();
  const to = new Date(y || 1970, m || 1, 1).getTime() - 1;
  return { from, to };
}

function todayDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function toLedgerRows(rows: any[] | undefined): LedgerRow[] {
  return (rows ?? []).map((r) => ({
    _id: String(r._id),
    amountCents: r.amountCents ?? 0,
    currency: r.currency ?? 'AED',
    status: r.status ?? 'pending',
    type: r.type ?? 'other',
    description: r.description ?? '—',
    provider: r.provider ?? '—',
    invoiceNumber: r.invoiceNumber ?? null,
    memberName: r.memberName ?? null,
    createdAt: r.createdAt ?? 0,
  }));
}

export default function FinancePage() {
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [day, setDay] = useState(todayDay());
  const [voidTarget, setVoidTarget] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [payoutName, setPayoutName] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('bank_transfer');
  const [bookMonth, setBookMonth] = useState(currentMonth());
  const [jKind, setJKind] = useState<'income' | 'expense'>('expense');
  const [jCategory, setJCategory] = useState('');
  const [jAmount, setJAmount] = useState('');
  const [jDate, setJDate] = useState(todayDay());
  const [jNote, setJNote] = useState('');
  const [importDrafts, setImportDrafts] = useState<JournalDraft[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const ledgerArgs =
    status === 'all' && type === 'all'
      ? { limit: 100 }
      : {
          limit: 100,
          ...(status !== 'all' ? { status: status as any } : {}),
          ...(type !== 'all' ? { type: type as any } : {}),
        };
  const ledger = useQuery(financeRefs.getLedger, ledgerArgs);
  const refunds = useQuery(financeRefs.listRefunds, { limit: 100 });
  const payouts = useQuery(financeRefs.listPayouts, { limit: 100 });
  const financeAudit = useQuery(financeRefs.listFinanceAudit, { limit: 50 });
  const dailyClose = useQuery(financeRefs.getDailyClose, { day });

  const recordPayout = useMutation(financeRefs.recordPayout);
  const decidePayout = useMutation(financeRefs.decidePayout);
  const voidPayment = useMutation(financeRefs.voidPayment);
  const recordJournalEntry = useMutation(financeRefs.recordJournalEntry);
  const { from: bookFrom, to: bookTo } = monthRange(bookMonth);
  const profitLoss = useQuery(financeRefs.getProfitAndLoss, { from: bookFrom, to: bookTo });
  const journal = useQuery(financeRefs.listJournalEntries, { limit: 200 });

  const ledgerRows = toLedgerRows(ledger as any[] | undefined);
  const refundRows: RefundRow[] = ((refunds as any[] | undefined) ?? []).map((r) => ({
    _id: String(r._id),
    amountCents: r.amountCents ?? 0,
    refundedAmountCents: r.refundedAmountCents ?? r.amountCents ?? 0,
    currency: r.currency ?? 'AED',
    description: r.description ?? '—',
    memberName: r.memberName ?? null,
    memberEmail: r.memberEmail ?? null,
    updatedAt: r.updatedAt ?? r.createdAt ?? 0,
  }));
  const auditRows: AuditRow[] = ((financeAudit as any[] | undefined) ?? []).map((e) => ({
    _id: String(e._id),
    action: e.action,
    entityType: e.entityType,
    entityId: String(e.entityId),
    timestamp: e.timestamp ?? e.createdAt ?? 0,
  }));

  const gross = ledgerRows
    .filter((r) => r.status === 'succeeded')
    .reduce((s, r) => s + r.amountCents, 0);
  const refunded = refundRows.reduce((s, r) => s + (r.refundedAmountCents ?? r.amountCents), 0);
  const payoutList = (payouts as any[] | undefined) ?? [];
  const payoutsCents = payoutList.reduce((s, p) => s + (p.amountCents ?? 0), 0);

  async function handleVoid() {
    if (!voidTarget.trim() || !voidReason.trim()) {
      setNotice('Enter a payment ID and a void reason.');
      return;
    }
    try {
      await voidPayment({ paymentId: voidTarget.trim() as any, reason: voidReason.trim() });
      setNotice('Payment voided.');
      setVoidTarget('');
      setVoidReason('');
    } catch (e: any) {
      setNotice(e?.data?.message ?? e?.message ?? 'Void failed.');
    }
  }

  async function handleJournal() {
    const cents = Math.round(Number(jAmount) * 100);
    if (!jCategory.trim()) {
      setNotice('Pick a category for the journal entry.');
      return;
    }
    if (!Number.isFinite(cents) || cents <= 0) {
      setNotice('Enter a positive amount for the journal entry.');
      return;
    }
    const parsed = Date.parse(`${jDate}T12:00:00`);
    try {
      await recordJournalEntry({
        kind: jKind,
        category: jCategory.trim(),
        amountCents: cents,
        currency: 'AED',
        note: jNote.trim() || undefined,
        entryDate: Number.isFinite(parsed) ? parsed : undefined,
      });
      setNotice(`${jKind === 'income' ? 'Income' : 'Expense'} of ${formatAed(cents)} recorded in the books.`);
      setJCategory('');
      setJAmount('');
      setJNote('');
    } catch (e: any) {
      setNotice(e?.data?.message ?? e?.message ?? 'Journal entry failed.');
    }
  }

  async function handleDecidePayout(payoutId: string, decision: 'paid' | 'cancelled') {
    try {
      await decidePayout({ payoutId: payoutId as any, decision });
      setNotice(decision === 'paid' ? 'Payout marked as paid.' : 'Payout cancelled.');
    } catch (e: any) {
      setNotice(e?.data?.message ?? e?.message ?? 'Payout decision failed.');
    }
  }

  async function handleImportFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const drafts = toJournalDrafts(parseCsv(text));
    setImportDrafts(drafts);
    const bad = drafts.filter((d) => d.error).length;
    setNotice(
      drafts.length === 0
        ? 'No rows found in that file.'
        : `${drafts.length - bad} of ${drafts.length} rows look valid${bad > 0 ? ` — ${bad} need fixing (edit the file and re-upload)` : ''}.`
    );
  }

  async function handleImportConfirm() {
    const valid = (importDrafts ?? []).filter((d) => !d.error);
    if (valid.length === 0 || importing) return;
    setImporting(true);
    let done = 0;
    let failed = 0;
    for (const d of valid) {
      try {
        await recordJournalEntry({
          kind: d.kind,
          category: d.category,
          amountCents: d.amountCents,
          currency: 'AED',
          note: d.note,
          entryDate: d.entryDate,
        });
        done++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setImportDrafts(null);
    setNotice(`Imported ${done} ${done === 1 ? 'entry' : 'entries'}${failed > 0 ? ` — ${failed} failed (see audit trail)` : ''}.`);
  }

  async function handlePayout() {
    const cents = Math.round(Number(payoutAmount) * 100);
    if (!payoutName.trim() || !Number.isFinite(cents) || cents <= 0) {
      setNotice('Enter a recipient and a positive AED amount.');
      return;
    }
    try {
      await recordPayout({
        recipientName: payoutName.trim(),
        amountCents: cents,
        currency: 'AED',
        method: payoutMethod as any,
      });
      setNotice('Payout recorded as pending.');
      setPayoutName('');
      setPayoutAmount('');
    } catch (e: any) {
      setNotice(e?.data?.message ?? e?.message ?? 'Payout failed.');
    }
  }

  const close = dailyClose as any | undefined;

  return (
    <RequireAuth>
      <AdminShell>
        <YStack gap={20} padding={24}>
          <YStack gap={4}>
            <Text fontSize={28} fontWeight="800">
              Finance
            </Text>
            <Text fontSize={13} opacity={0.6}>
              Ledger · books (P&amp;L + journal) · refunds · payouts · audit trail · daily close (staff only)
            </Text>
            <XStack gap={12}>
              <Link href="/reports" style={{ fontSize: 13, color: '#0081cc', fontWeight: 600 }}>
                Reports center →
              </Link>
              <Link href="/audit" style={{ fontSize: 13, color: '#0081cc', fontWeight: 600 }}>
                Audit log →
              </Link>
            </XStack>
          </YStack>

          {notice && (
            <Text fontSize={13} fontWeight="600" color="#0081cc">
              {notice}
            </Text>
          )}

          {ledger === undefined ? (
            <Text fontSize={13} opacity={0.6}>
              Loading live ledger…
            </Text>
          ) : (
            <OverviewCards
              summary={{
                grossCents: gross,
                refundedCents: refunded,
                netCents: gross - refunded,
                succeededCount: ledgerRows.filter((r) => r.status === 'succeeded').length,
                refundedCount: refundRows.length,
                payoutsCents,
                payoutsCount: payoutList.length,
              }}
            />
          )}

          <YStack gap={8}>
            <Text fontSize={18} fontWeight="700">
              Books — profit &amp; loss
            </Text>
            <XStack gap={12} alignItems="center" flexWrap="wrap">
              <label style={{ fontSize: 13 }}>
                Month:{' '}
                <input type="month" value={bookMonth} onChange={(e) => setBookMonth(e.target.value)} />
              </label>
              {profitLoss === undefined ? (
                <Text fontSize={13} opacity={0.6}>
                  Loading P&amp;L…
                </Text>
              ) : (
                <BooksStatement pl={profitLoss as any} />
              )}
            </XStack>
          </YStack>

          <YStack gap={8}>
            <Text fontSize={18} fontWeight="700">
              Record a book entry
            </Text>
            <Text fontSize={12} opacity={0.6}>
              Off-system income or expense (cash café sales, utility bills, petty cash). Flows
              into P&amp;L alongside payments, refunds and payouts.
            </Text>
            <XStack gap={8} flexWrap="wrap" alignItems="center">
              <select value={jKind} onChange={(e) => setJKind(e.target.value as 'income' | 'expense')}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <input
                placeholder="Category"
                value={jCategory}
                onChange={(e) => setJCategory(e.target.value)}
                list="queenix-journal-cats"
                style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', minWidth: 160 }}
              />
              <datalist id="queenix-journal-cats">
                {(jKind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <input
                placeholder="Amount (AED)"
                value={jAmount}
                onChange={(e) => setJAmount(e.target.value)}
                inputMode="decimal"
                style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', width: 130 }}
              />
              <input
                type="date"
                value={jDate}
                onChange={(e) => setJDate(e.target.value)}
                style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)' }}
              />
              <input
                placeholder="Note (optional)"
                value={jNote}
                onChange={(e) => setJNote(e.target.value)}
                style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', minWidth: 200 }}
              />
              <button
                onClick={handleJournal}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#0081cc',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Record entry
              </button>
            </XStack>
          </YStack>

          <YStack gap={8}>
            <Text fontSize={18} fontWeight="700">
              Import books from CSV
            </Text>
            <Text fontSize={12} opacity={0.6}>
              Upload a CSV with date, kind (income/expense), category, amount and note
              columns — the same shape as the journal export. Rows are previewed below;
              only valid rows are imported.
            </Text>
            <XStack gap={8} flexWrap="wrap" alignItems="center">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  void handleImportFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              {importDrafts !== null && importDrafts.filter((d) => !d.error).length > 0 && (
                <button
                  onClick={handleImportConfirm}
                  disabled={importing}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: importing ? 'var(--bg-muted)' : '#0081cc',
                    color: importing ? 'var(--text-muted)' : 'white',
                    fontWeight: 600,
                    cursor: importing ? 'default' : 'pointer',
                  }}
                >
                  {importing ? 'Importing…' : `Import ${importDrafts.filter((d) => !d.error).length} valid rows`}
                </button>
              )}
            </XStack>
            {importDrafts !== null && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead>
                    <tr>
                      {['Date', 'Kind', 'Category', 'Amount', 'Status'].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: 'left',
                            padding: '8px 0',
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importDrafts.map((d) => (
                      <tr key={d.line} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 0', fontSize: 13 }}>
                          {new Date(d.entryDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '8px 0', fontSize: 13, textTransform: 'capitalize' }}>{d.kind}</td>
                        <td style={{ padding: '8px 0', fontSize: 13 }}>{d.category || '—'}</td>
                        <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 700 }}>{formatAed(d.amountCents)}</td>
                        <td style={{ padding: '8px 0', fontSize: 12, fontWeight: 600, color: d.error ? '#dc2626' : 'var(--success)' }}>
                          {d.error ?? 'valid'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </YStack>

          <YStack gap={8}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={18} fontWeight="700">
                Journal
              </Text>
              {journal !== undefined && (journal as any[]).length > 0 && (
                <button
                  onClick={() =>
                    downloadCsv(
                      `finance-journal-${todayDay()}`,
                      (journal as any[]).map((r) => ({
                        date: new Date(r.entryDate).toISOString().slice(0, 10),
                        kind: r.kind,
                        category: r.category,
                        amountAED: ((r.amountCents ?? 0) / 100).toFixed(2),
                        note: r.note ?? '',
                      }))
                    )
                  }
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-muted)',
                    color: 'var(--text)',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Export CSV
                </button>
              )}
            </XStack>
            {journal === undefined ? (
              <Text fontSize={13} opacity={0.6}>
                Loading journal…
              </Text>
            ) : (journal as any[]).length === 0 ? (
              <Text fontSize={13} opacity={0.6}>
                No book entries yet — record the first one above.
              </Text>
            ) : (
              <JournalTable rows={journal as any[]} />
            )}
          </YStack>

          <YStack gap={8}>
            <Text fontSize={18} fontWeight="700">
              Filters
            </Text>
            <XStack gap={12} flexWrap="wrap">
              <label style={{ fontSize: 13 }}>
                Status:{' '}
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 13 }}>
                Type:{' '}
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </XStack>
          </YStack>

          {ledger === undefined ? (
            <Text fontSize={13} opacity={0.6}>
              Loading transactions…
            </Text>
          ) : (
            <TransactionsTable
              rows={ledgerRows}
              onExport={() => downloadCsv(`finance-ledger-${todayDay()}`, ledgerRows)}
            />
          )}

          <YStack gap={8}>
            <Text fontSize={18} fontWeight="700">
              Daily close
            </Text>
            <XStack gap={12} alignItems="center" flexWrap="wrap">
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
              {close ? (
                <Text fontSize={13}>
                  Gross {formatAed(close.grossCents)} · refunded {formatAed(close.refundedCents)} ·
                  net {formatAed(close.netCents)} · {close.succeededCount} succeeded ·{' '}
                  {close.refundedCount} refunded · payouts {formatAed(close.payoutsCents)} (
                  {close.payoutsCount})
                </Text>
              ) : (
                <Text fontSize={13} opacity={0.6}>
                  Loading daily close…
                </Text>
              )}
            </XStack>
          </YStack>

          <YStack gap={8}>
            <Text fontSize={18} fontWeight="700">
              Payouts
            </Text>
            {payoutList.length === 0 ? (
              <Text fontSize={13} opacity={0.6}>
                {payouts === undefined ? 'Loading payouts…' : 'No payouts recorded yet.'}
              </Text>
            ) : (
              <YStack gap={8}>
                {payoutList.map((p: any) => (
                  <XStack
                    key={String(p._id)}
                    gap={12}
                    padding={12}
                    borderRadius={10}
                    borderWidth={1}
                    borderColor="$borderColor"
                    alignItems="center"
                  >
                    <YStack flex={2} gap={2}>
                      <Text fontSize={14} fontWeight="600">
                        {p.recipientName}
                      </Text>
                      <Text fontSize={12} opacity={0.6}>
                        {p.method} · {p.status} ·{' '}
                        {new Date(p.createdAt).toLocaleDateString('en-AE')}
                      </Text>
                    </YStack>
                    <Text fontSize={14} fontWeight="700">
                      {formatAed(p.amountCents ?? 0)}
                    </Text>
                    {p.status === 'pending' && (
                      <XStack gap={6}>
                        <button
                          onClick={() => handleDecidePayout(String(p._id), 'paid')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: 'none',
                            background: '#10b981',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          Mark paid
                        </button>
                        <button
                          onClick={() => handleDecidePayout(String(p._id), 'cancelled')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid #dc2626',
                            background: 'white',
                            color: '#dc2626',
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </XStack>
                    )}
                  </XStack>
                ))}
              </YStack>
            )}
            <XStack gap={8} flexWrap="wrap" alignItems="center">
              <input
                placeholder="Recipient name"
                value={payoutName}
                onChange={(e) => setPayoutName(e.target.value)}
                style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)' }}
              />
              <input
                placeholder="Amount (AED)"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                inputMode="decimal"
                style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', width: 140 }}
              />
              <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}>
                <option value="bank_transfer">bank_transfer</option>
                <option value="cash">cash</option>
                <option value="wallet">wallet</option>
              </select>
              <button
                onClick={handlePayout}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#0081cc',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Record payout
              </button>
            </XStack>
          </YStack>

          <YStack gap={8}>
            <Text fontSize={18} fontWeight="700">
              Void a payment
            </Text>
            <Text fontSize={12} opacity={0.6}>
              Only pending or failed payments can be voided; succeeded payments must be refunded
              instead.
            </Text>
            <XStack gap={8} flexWrap="wrap" alignItems="center">
              <input
                placeholder="Payment ID"
                value={voidTarget}
                onChange={(e) => setVoidTarget(e.target.value)}
                style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', minWidth: 220 }}
              />
              <input
                placeholder="Reason (required)"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', minWidth: 220 }}
              />
              <button
                onClick={handleVoid}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid #dc2626',
                  background: 'white',
                  color: '#dc2626',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Void payment
              </button>
            </XStack>
          </YStack>

          {refunds === undefined ? (
            <Text fontSize={13} opacity={0.6}>
              Loading refunds…
            </Text>
          ) : (
            <RefundsTable rows={refundRows} />
          )}

          {financeAudit === undefined ? (
            <Text fontSize={13} opacity={0.6}>
              Loading audit trail…
            </Text>
          ) : (
            <AuditTrail rows={auditRows} />
          )}
        </YStack>
      </AdminShell>
    </RequireAuth>
  );
}

type ProfitLoss = {
  grossCents: number;
  refundedCents: number;
  payoutsCents: number;
  manualIncomeCents: number;
  manualExpenseCents: number;
  netCents: number;
  succeededCount: number;
  refundedCount: number;
  payoutsCount: number;
  journalCount: number;
};

/** Month P&L statement: system income + manual books − refunds/payouts = net. */
function BooksStatement({ pl }: { pl: ProfitLoss }) {
  const incomeTotal = pl.grossCents + pl.manualIncomeCents;
  const expenseTotal = pl.refundedCents + pl.payoutsCents + pl.manualExpenseCents;
  const rows: Array<{ label: string; detail: string; cents: number; tone: 'income' | 'expense' | 'net' }> = [
    { label: 'Membership & system revenue', detail: `${pl.succeededCount} succeeded payments`, cents: pl.grossCents, tone: 'income' },
    { label: 'Manual income', detail: 'journal entries', cents: pl.manualIncomeCents, tone: 'income' },
    { label: 'Refunds', detail: `${pl.refundedCount} refunded`, cents: -pl.refundedCents, tone: 'expense' },
    { label: 'Payouts', detail: `${pl.payoutsCount} payouts`, cents: -pl.payoutsCents, tone: 'expense' },
    { label: 'Manual expenses', detail: 'journal entries', cents: -pl.manualExpenseCents, tone: 'expense' },
  ];
  return (
    <YStack
      gap={0}
      padding={16}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$background"
      flex={1}
      minWidth={280}
    >
      <XStack justifyContent="space-between" marginBottom={8}>
        <Text fontSize={13} fontWeight="700">Income {formatAed(incomeTotal)}</Text>
        <Text fontSize={13} fontWeight="700">Expenses {formatAed(expenseTotal)}</Text>
      </XStack>
      {rows.map((r) => (
        <XStack key={r.label} justifyContent="space-between" paddingVertical={6} borderTopWidth={1} borderTopColor="$borderColor">
          <YStack gap={1}>
            <Text fontSize={13} fontWeight="600">{r.label}</Text>
            <Text fontSize={11} opacity={0.55}>{r.detail}</Text>
          </YStack>
          <Text fontSize={13} fontWeight="700" color={r.tone === 'income' ? '#10b981' : r.tone === 'expense' ? '#dc2626' : undefined}>
            {r.cents > 0 ? '+' : ''}{formatAed(r.cents)}
          </Text>
        </XStack>
      ))}
      <XStack justifyContent="space-between" alignItems="center" marginTop={8} padding={10} borderRadius={8} backgroundColor="$blue2">
        <Text fontSize={14} fontWeight="800">Net profit</Text>
        <Text fontSize={18} fontWeight="800" color={pl.netCents >= 0 ? '#10b981' : '#dc2626'}>
          {formatAed(pl.netCents)}
        </Text>
      </XStack>
    </YStack>
  );
}

type JournalRow = {
  _id: string;
  entryDate: number;
  kind: 'income' | 'expense';
  category: string;
  amountCents: number;
  currency?: string;
  note?: string | null;
};

/** Manual bookkeeping journal, newest first. */
function JournalTable({ rows }: { rows: JournalRow[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <thead>
          <tr>
            {['Date', 'Type', 'Category', 'Note', 'Amount'].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: h === 'Amount' ? 'right' : 'left',
                  padding: '8px 0',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '10px 0', fontSize: 13 }}>
                {new Date(r.entryDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td style={{ padding: '10px 0' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: r.kind === 'income' ? '#10b98120' : '#dc262620',
                    color: r.kind === 'income' ? 'var(--success)' : '#dc2626',
                    textTransform: 'uppercase',
                  }}
                >
                  {r.kind}
                </span>
              </td>
              <td style={{ padding: '10px 0', fontSize: 14, fontWeight: 500 }}>{r.category}</td>
              <td style={{ padding: '10px 0', fontSize: 13, color: 'var(--text-muted)' }}>{r.note ?? '—'}</td>
              <td style={{ padding: '10px 0', fontSize: 14, fontWeight: 700, textAlign: 'right', color: r.kind === 'income' ? 'var(--success)' : '#dc2626' }}>
                {r.kind === 'income' ? '+' : '−'}{formatAed(r.amountCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
