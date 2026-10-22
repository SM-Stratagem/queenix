'use client';

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { formatAed } from './OverviewCards';
import { financeRefs } from '../../app/finance/api';

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

/** Month picker + P&L statement. */
export function BooksSection() {
  const [bookMonth, setBookMonth] = useState(currentMonth());
  const { from, to } = monthRange(bookMonth);
  const profitLoss = useQuery(financeRefs.getProfitAndLoss, { from, to });
  return (
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
          <BooksStatement pl={profitLoss as ProfitLoss} />
        )}
      </XStack>
    </YStack>
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
