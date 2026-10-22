'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { formatAed } from './OverviewCards';
import { downloadCsv } from './CsvExport';
import { JournalImport } from './JournalImport';
import { btn, field, th, todayDay } from './ui';
import { errMsg } from '@/lib/errors';
import { financeRefs } from '../../app/finance/api';
import { ScanButton, ScanLink, ScanNotice, useUploadScan } from '../ocr/ScanKit';
import { receiptPrefill } from './receiptPrefill';
import type { OcrResult } from '@queenix/convex';

const INCOME_CATEGORIES = ['Membership dues', 'PT packages', 'Events', 'Café', 'Salon', 'Other income'];
const EXPENSE_CATEGORIES = ['Payroll', 'Rent', 'Utilities', 'Supplies', 'Marketing', 'Maintenance', 'Other expense'];

/** Manual books: record an entry, bulk-import CSV, browse + export the journal. */
export function JournalSection({ notify }: { notify: (msg: string) => void }) {
  const [jKind, setJKind] = useState<'income' | 'expense'>('expense');
  const [jCategory, setJCategory] = useState('');
  const [jAmount, setJAmount] = useState('');
  const [jDate, setJDate] = useState(todayDay());
  const [jNote, setJNote] = useState('');
  const [receipt, setReceipt] = useState<{ result: OcrResult; file: File } | null>(null);
  const uploadScan = useUploadScan();
  const recordJournalEntry = useMutation(financeRefs.recordJournalEntry);
  const journal = useQuery(financeRefs.listJournalEntries, { limit: 200 }) as JournalRow[] | undefined;

  async function handleJournal() {
    const cents = Math.round(Number(jAmount) * 100);
    if (!jCategory.trim()) {
      notify('Pick a category for the journal entry.');
      return;
    }
    if (!Number.isFinite(cents) || cents <= 0) {
      notify('Enter a positive amount for the journal entry.');
      return;
    }
    const parsed = Date.parse(`${jDate}T12:00:00`);
    try {
      // Receipt image is stored only once the reviewed entry is confirmed.
      const receiptStorageId = receipt ? await uploadScan(receipt.file) : undefined;
      await recordJournalEntry({
        receiptStorageId,
        kind: jKind,
        category: jCategory.trim(),
        amountCents: cents,
        currency: 'AED',
        note: jNote.trim() || undefined,
        entryDate: Number.isFinite(parsed) ? parsed : undefined,
      });
      notify(`${jKind === 'income' ? 'Income' : 'Expense'} of ${formatAed(cents)} recorded in the books.`);
      setJCategory('');
      setJAmount('');
      setJNote('');
      setReceipt(null);
    } catch (e) {
      notify(errMsg(e, 'Journal entry failed.'));
    }
  }

  return (
    <>
      <YStack gap={8}>
        <Text fontSize={18} fontWeight="700">
          Record a book entry
        </Text>
        <Text fontSize={12} opacity={0.6}>
          Off-system income or expense (cash café sales, utility bills, petty cash). Flows
          into P&amp;L alongside payments, refunds and payouts.
        </Text>
        <XStack gap={8} alignItems="center">
          <ScanButton
            kind="receipt"
            label="Scan receipt"
            onResult={(result, file) => {
              const p = receiptPrefill(result.fields ?? {});
              setReceipt({ result, file });
              setJKind('expense');
              setJCategory(p.category);
              setJAmount(p.amount);
              if (p.date) setJDate(p.date);
              setJNote(p.note);
              notify(
                p.currency !== 'AED'
                  ? `Receipt is in ${p.currency} — convert the amount to AED before recording.`
                  : 'Receipt read — review the prefilled entry below, then Record entry.'
              );
            }}
          />
          {receipt && (
            <button onClick={() => setReceipt(null)} style={btn.ghost}>
              Detach receipt
            </button>
          )}
        </XStack>
        {receipt && <ScanNotice result={receipt.result} />}
        <XStack gap={8} flexWrap="wrap" alignItems="center">
          <select aria-label="Entry kind" value={jKind} onChange={(e) => setJKind(e.target.value as 'income' | 'expense')}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input
            placeholder="Category"
            aria-label="Category"
            value={jCategory}
            onChange={(e) => setJCategory(e.target.value)}
            list="queenix-journal-cats"
            style={{ ...field, minWidth: 160 }}
          />
          <datalist id="queenix-journal-cats">
            {(jKind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <input
            placeholder="Amount (AED)"
            aria-label="Entry amount (AED)"
            value={jAmount}
            onChange={(e) => setJAmount(e.target.value)}
            inputMode="decimal"
            style={{ ...field, width: 130 }}
          />
          <input type="date" aria-label="Entry date" value={jDate} onChange={(e) => setJDate(e.target.value)} style={field} />
          <input
            placeholder="Note (optional)"
            aria-label="Note"
            value={jNote}
            onChange={(e) => setJNote(e.target.value)}
            style={{ ...field, minWidth: 200 }}
          />
          <button onClick={handleJournal} style={btn.primary}>
            Record entry
          </button>
        </XStack>
      </YStack>

      <JournalImport notify={notify} />

      <YStack gap={8}>
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontSize={18} fontWeight="700">
            Journal
          </Text>
          {journal !== undefined && journal.length > 0 && (
            <button
              onClick={() =>
                downloadCsv(
                  `finance-journal-${todayDay()}`,
                  journal.map((r) => ({
                    date: new Date(r.entryDate).toISOString().slice(0, 10),
                    kind: r.kind,
                    category: r.category,
                    amountAED: ((r.amountCents ?? 0) / 100).toFixed(2),
                    note: r.note ?? '',
                  }))
                )
              }
              style={btn.ghost}
            >
              Export CSV
            </button>
          )}
        </XStack>
        {journal === undefined ? (
          <Text fontSize={13} opacity={0.6}>
            Loading journal…
          </Text>
        ) : journal.length === 0 ? (
          <Text fontSize={13} opacity={0.6}>
            No book entries yet — record the first one above.
          </Text>
        ) : (
          <JournalTable rows={journal} />
        )}
      </YStack>
    </>
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
  receiptStorageId?: string | null;
};

/** Manual bookkeeping journal, newest first. */
function JournalTable({ rows }: { rows: JournalRow[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <thead>
          <tr>
            {['Date', 'Type', 'Category', 'Note', 'Receipt', 'Amount'].map((h) => (
              <th
                key={h}
                style={{ ...th, textAlign: h === 'Amount' ? 'right' : 'left' }}
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
              <td style={{ padding: '10px 0', fontSize: 13 }}>
                {r.receiptStorageId ? <ScanLink storageId={r.receiptStorageId} label="receipt" /> : '—'}
              </td>
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
