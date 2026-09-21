'use client';

import React from 'react';
import { YStack, XStack, Text } from 'tamagui';

export interface FinanceSummary {
  grossCents: number;
  refundedCents: number;
  netCents: number;
  succeededCount: number;
  refundedCount: number;
  payoutsCents: number;
  payoutsCount: number;
}

export function formatAed(cents: number): string {
  return `${(cents / 100).toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED`;
}

const CARDS: { key: keyof FinanceSummary; label: string; money: boolean }[] = [
  { key: 'grossCents', label: 'Gross collected', money: true },
  { key: 'refundedCents', label: 'Refunded', money: true },
  { key: 'netCents', label: 'Net revenue', money: true },
  { key: 'succeededCount', label: 'Successful payments', money: false },
  { key: 'refundedCount', label: 'Refunds issued', money: false },
  { key: 'payoutsCents', label: 'Payouts issued', money: true },
];

export function OverviewCards({ summary }: { summary: FinanceSummary }) {
  return (
    <XStack gap={12} flexWrap="wrap">
      {CARDS.map((card) => (
        <YStack
          key={card.key}
          flex={1}
          minWidth={150}
          gap={4}
          padding={16}
          borderRadius={12}
          backgroundColor="$background"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <Text fontSize={12} opacity={0.6}>
            {card.label}
          </Text>
          <Text fontSize={22} fontWeight="800">
            {card.money ? formatAed(summary[card.key] as number) : summary[card.key]}
          </Text>
        </YStack>
      ))}
    </XStack>
  );
}
