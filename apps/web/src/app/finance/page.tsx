'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { OverviewCards, formatAed } from '../../components/finance/OverviewCards';
import { TransactionsTable, type LedgerRow } from '../../components/finance/TransactionsTable';
import { RefundsTable, type RefundRow } from '../../components/finance/RefundsTable';
import { AuditTrail, type AuditRow } from '../../components/finance/AuditTrail';
import { BooksSection } from '../../components/finance/BooksSection';
import { JournalSection } from '../../components/finance/JournalSection';
import { PayoutsSection, type PayoutRow } from '../../components/finance/PayoutsSection';
import { downloadCsv } from '../../components/finance/CsvExport';
import { todayDay } from '../../components/finance/ui';
import { errMsg } from '@/lib/errors';
import { financeRefs } from './api';

const STATUS_OPTIONS = ['all', 'pending', 'succeeded', 'failed', 'refunded', 'cancelled'];
const TYPE_OPTIONS = ['all', 'membership', 'pt_package', 'event', 'other'];

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
  const [notice, setNotice] = useState<string | null>(null);

  const ledgerArgs = {
    limit: 100,
    ...(status !== 'all' ? { status } : {}),
    ...(type !== 'all' ? { type } : {}),
  };
  const ledger = useQuery(financeRefs.getLedger, ledgerArgs);
  const refunds = useQuery(financeRefs.listRefunds, { limit: 100 });
  const payouts = useQuery(financeRefs.listPayouts, { limit: 100 }) as PayoutRow[] | undefined;
  const financeAudit = useQuery(financeRefs.listFinanceAudit, { limit: 50 });
  const close = useQuery(financeRefs.getDailyClose, { day }) as any | undefined;
  const voidPayment = useMutation(financeRefs.voidPayment);

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
  const payoutList = payouts ?? [];
  const payoutsCents = payoutList.reduce((s, p) => s + (p.amountCents ?? 0), 0);

  // ponytail: native prompt for the void reason; swap for a dialog if copy/design needs it.
  async function handleVoid(row: LedgerRow) {
    const who = row.memberName ? ` for ${row.memberName}` : '';
    const reason = window.prompt(`Void "${row.description}"${who} (${formatAed(row.amountCents)})?\nReason (required):`);
    if (reason === null) return;
    if (!reason.trim()) {
      setNotice('A void reason is required.');
      return;
    }
    try {
      await voidPayment({ paymentId: row._id, reason: reason.trim() });
      setNotice(`Payment voided${who}.`);
    } catch (e) {
      setNotice(errMsg(e, 'Void failed.'));
    }
  }

  return (
    <YStack gap={20} padding={24}>
      <YStack gap={4}>
        <Text fontSize={28} fontWeight="800">
          Finance
        </Text>
        <Text fontSize={13} opacity={0.6}>
          Ledger · books (P&amp;L + journal) · refunds · payouts · audit trail · daily close
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
        <Text role="status" fontSize={13} fontWeight="600" color="#0081cc">
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

      <BooksSection />
      <JournalSection notify={setNotice} />

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
          onVoid={handleVoid}
        />
      )}

      <YStack gap={8}>
        <Text fontSize={18} fontWeight="700">
          Daily close
        </Text>
        <XStack gap={12} alignItems="center" flexWrap="wrap">
          <input type="date" aria-label="Close day" value={day} onChange={(e) => setDay(e.target.value)} />
          {close ? (
            <Text fontSize={13}>
              Gross {formatAed(close.grossCents)} · refunded {formatAed(close.refundedCents)} · net{' '}
              {formatAed(close.netCents)} · {close.succeededCount} succeeded · {close.refundedCount} refunded ·
              payouts {formatAed(close.payoutsCents)} ({close.payoutsCount})
            </Text>
          ) : (
            <Text fontSize={13} opacity={0.6}>
              Loading daily close…
            </Text>
          )}
        </XStack>
      </YStack>

      <PayoutsSection payouts={payouts} notify={setNotice} />

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
  );
}
