'use client';

import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { formatAed } from './OverviewCards';

export interface RefundRow {
  _id: string;
  amountCents: number;
  refundedAmountCents?: number;
  currency: string;
  description: string;
  memberName: string | null;
  memberEmail: string | null;
  updatedAt: number;
}

export function RefundsTable({ rows }: { rows: RefundRow[] }) {
  return (
    <YStack gap={12}>
      <Text fontSize={18} fontWeight="700">
        Refunds
      </Text>
      {rows.length === 0 ? (
        <Text fontSize={13} opacity={0.6}>
          No refunds in this period.
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
                  {row.memberName ?? row.memberEmail ?? '—'} ·{' '}
                  {new Date(row.updatedAt).toLocaleDateString('en-AE')}
                </Text>
              </YStack>
              <Text fontSize={14} fontWeight="700" color="#7c3aed">
                −{formatAed(row.refundedAmountCents ?? row.amountCents)}
              </Text>
            </XStack>
          ))}
        </YStack>
      )}
    </YStack>
  );
}
