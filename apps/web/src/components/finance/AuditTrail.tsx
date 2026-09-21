'use client';

import React from 'react';
import { YStack, XStack, Text } from 'tamagui';

export interface AuditRow {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: number;
}

export function AuditTrail({ rows }: { rows: AuditRow[] }) {
  return (
    <YStack gap={12}>
      <Text fontSize={18} fontWeight="700">
        Audit trail
      </Text>
      {rows.length === 0 ? (
        <Text fontSize={13} opacity={0.6}>
          No finance audit events yet.
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
                <Text fontSize={13} fontWeight="700" fontFamily="$mono">
                  {row.action}
                </Text>
                <Text fontSize={12} opacity={0.6}>
                  {row.entityType} · {row.entityId.slice(0, 12)}… ·{' '}
                  {new Date(row.timestamp).toLocaleString('en-AE')}
                </Text>
              </YStack>
            </XStack>
          ))}
        </YStack>
      )}
    </YStack>
  );
}
