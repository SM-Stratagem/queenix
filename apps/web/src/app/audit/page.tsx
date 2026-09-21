'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { AdminShell } from '@/components/admin/AdminShell';
import { RequireAuth } from '@/components/RequireAuth';
import { downloadCsv } from '../../components/finance/CsvExport';
import { financeRefs } from '../finance/api';

const PREFIX_OPTIONS = ['all', 'payment.', 'payout.', 'invoice.', 'finance.'];

export default function AuditPage() {
  const [prefix, setPrefix] = useState('all');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');

  const args: any = { limit: 200 };
  if (prefix !== 'all') args.actionPrefix = prefix;
  if (entityType.trim()) args.entityType = entityType.trim();
  if (entityId.trim()) args.entityId = entityId.trim();

  const events = useQuery(financeRefs.listAuditEvents, args);
  const rows = (events as any[] | undefined) ?? [];

  return (
    <RequireAuth>
      <AdminShell>
        <YStack gap={20} padding={24}>
          <YStack gap={4}>
            <Text fontSize={28} fontWeight="800">
              Audit log
            </Text>
            <Text fontSize={13} opacity={0.6}>
              Staff-only trail of payment, payout, invoice, and finance actions
            </Text>
            <XStack gap={12}>
              <Link href="/finance" style={{ fontSize: 13, color: '#0081cc', fontWeight: 600 }}>
                ← Finance
              </Link>
              <Link href="/reports" style={{ fontSize: 13, color: '#0081cc', fontWeight: 600 }}>
                Reports center →
              </Link>
            </XStack>
          </YStack>

          <XStack gap={12} flexWrap="wrap" alignItems="center">
            <label style={{ fontSize: 13 }}>
              Action:{' '}
              <select value={prefix} onChange={(e) => setPrefix(e.target.value)}>
                {PREFIX_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <input
              placeholder="Entity type (e.g. payment)"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
            />
            <input
              placeholder="Entity ID"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
            />
            {rows.length > 0 && (
              <Text
                fontSize={13}
                fontWeight="600"
                color="#0081cc"
                cursor="pointer"
                onPress={() => downloadCsv('audit-log', rows)}
              >
                Export CSV
              </Text>
            )}
          </XStack>

          {events === undefined ? (
            <Text fontSize={13} opacity={0.6}>
              Loading audit events…
            </Text>
          ) : rows.length === 0 ? (
            <Text fontSize={13} opacity={0.6}>
              No audit events match these filters yet. Audit entries are written by finance
              mutations (payouts, voids) and payment flows as they occur — this view never shows
              placeholder data.
            </Text>
          ) : (
            <YStack gap={8}>
              {rows.map((e: any) => (
                <XStack
                  key={String(e._id)}
                  gap={12}
                  padding={12}
                  borderRadius={10}
                  borderWidth={1}
                  borderColor="$borderColor"
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <YStack flex={2} gap={2} minWidth={220}>
                    <Text fontSize={13} fontWeight="700" fontFamily="$mono">
                      {e.action}
                    </Text>
                    <Text fontSize={12} opacity={0.6}>
                      {e.entityType} · {String(e.entityId).slice(0, 24)} ·{' '}
                      {new Date(e.timestamp).toLocaleString('en-AE')}
                    </Text>
                  </YStack>
                  {(e.before !== undefined || e.after !== undefined) && (
                    <Text fontSize={11} opacity={0.6} fontFamily="$mono">
                      {JSON.stringify({ before: e.before ?? null, after: e.after ?? null }).slice(
                        0,
                        160
                      )}
                    </Text>
                  )}
                </XStack>
              ))}
            </YStack>
          )}
        </YStack>
      </AdminShell>
    </RequireAuth>
  );
}
