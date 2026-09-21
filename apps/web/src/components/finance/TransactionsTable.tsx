'use client';

import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { formatAed } from './OverviewCards';

export type StaffRole =
  | 'superadmin'
  | 'admin'
  | 'finance'
  /** @deprecated Renamed to 'finance'. */
  | 'owner'
  | 'operations'
  | 'salon'
  | 'coffee'
  | 'trainer'
  | 'member';

export interface LedgerRow {
  _id: string;
  amountCents: number;
  currency: string;
  status: string;
  type: string;
  description: string;
  provider: string;
  invoiceNumber: string | null;
  memberName: string | null;
  createdAt: number;
}

const STATUS_COLORS: Record<string, string> = {
  succeeded: '#16a34a',
  pending: '#d97706',
  failed: '#dc2626',
  refunded: '#7c3aed',
  cancelled: '#6b7280',
};

export function TransactionsTable({
  rows,
  onExport,
}: {
  rows: LedgerRow[];
  onExport: () => void;
}) {
  return (
    <YStack gap={12}>
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={18} fontWeight="700">
          Transactions
        </Text>
        <Text fontSize={13} fontWeight="600" onPress={onExport} cursor="pointer">
          Export CSV
        </Text>
      </XStack>
      {rows.length === 0 ? (
        <Text fontSize={13} opacity={0.6}>
          No transactions in this period.
        </Text>
      ) : (
        <YStack gap={8}>
          {rows.map((row) => (
            <XStack
              key={row._id}
              gap={12}
              padding={12}
              borderRadius={10}
              borderWidth={1}
              borderColor="$borderColor"
              alignItems="center"
            >
              <YStack flex={2} gap={2}>
                <Text fontSize={14} fontWeight="600">
                  {row.description}
                </Text>
                <Text fontSize={12} opacity={0.6}>
                  {row.memberName ?? '—'} · {row.invoiceNumber ?? 'no invoice'} ·{' '}
                  {new Date(row.createdAt).toLocaleDateString('en-AE')}
                </Text>
              </YStack>
              <Text fontSize={12} opacity={0.6}>
                {row.type} · {row.provider}
              </Text>
              <Text
                fontSize={12}
                fontWeight="700"
                color={STATUS_COLORS[row.status] ?? '#6b7280'}
              >
                {row.status}
              </Text>
              <Text fontSize={14} fontWeight="700" minWidth={110} textAlign="right">
                {formatAed(row.amountCents)}
              </Text>
            </XStack>
          ))}
        </YStack>
      )}
    </YStack>
  );
}
