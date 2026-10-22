'use client';

import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { formatAed } from './OverviewCards';
import { parseCsv, toJournalDrafts, type JournalDraft } from './CsvImport';
import { btn, th } from './ui';
import { financeRefs } from '../../app/finance/api';

/** CSV → previewed journal drafts → import the valid rows. */
export function JournalImport({ notify }: { notify: (msg: string) => void }) {
  const [importDrafts, setImportDrafts] = useState<JournalDraft[] | null>(null);
  const [importing, setImporting] = useState(false);
  const recordJournalEntry = useMutation(financeRefs.recordJournalEntry);
  const validCount = (importDrafts ?? []).filter((d) => !d.error).length;

  async function handleImportFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const drafts = toJournalDrafts(parseCsv(text));
    setImportDrafts(drafts);
    const bad = drafts.filter((d) => d.error).length;
    notify(
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
    notify(`Imported ${done} ${done === 1 ? 'entry' : 'entries'}${failed > 0 ? ` — ${failed} failed (see audit trail)` : ''}.`);
  }

  return (
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
          aria-label="Journal CSV file"
          onChange={(e) => {
            void handleImportFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {validCount > 0 && (
          <button onClick={handleImportConfirm} disabled={importing} style={importing ? btn.disabled : btn.primary}>
            {importing ? 'Importing…' : `Import ${validCount} valid rows`}
          </button>
        )}
      </XStack>
      {importDrafts !== null && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                {['Date', 'Kind', 'Category', 'Amount', 'Status'].map((h) => (
                  <th key={h} style={th}>
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
  );
}
