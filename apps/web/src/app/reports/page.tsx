'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { AdminShell } from '@/components/admin/AdminShell';
import { RequireAuth } from '@/components/RequireAuth';
import { formatAed } from '../../components/finance/OverviewCards';
import { downloadCsv } from '../../components/finance/CsvExport';
import { financeRefs } from '../finance/api';

const MONTH_OPTIONS = [3, 6, 12];
const WINDOW_OPTIONS = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 12 months', days: 365 },
];

export default function ReportsPage() {
  const [monthsBack, setMonthsBack] = useState(6);
  const [windowDays, setWindowDays] = useState(30);

  const revenue = useQuery(financeRefs.getRevenueAnalytics, { monthsBack });
  const to = Date.now();
  const from = to - windowDays * 24 * 3600 * 1000;
  const pnl = useQuery(financeRefs.getProfitAndLoss, { from, to });
  const retention = useQuery(financeRefs.getRetentionProjection, {});

  const months = (revenue as any[] | undefined) ?? [];
  const maxNet = Math.max(1, ...months.map((m: any) => m.netCents));
  const p = pnl as any | undefined;
  const r = retention as any | undefined;

  return (
    <RequireAuth>
      <AdminShell>
        <YStack gap={20} padding={24}>
          <YStack gap={4}>
            <Text fontSize={28} fontWeight="800">
              Reports
            </Text>
            <Text fontSize={13} opacity={0.6}>
              Revenue analytics · profit & loss · retention projections (staff only)
            </Text>
            <XStack gap={12}>
              <Link href="/finance" style={{ fontSize: 13, color: '#0081cc', fontWeight: 600 }}>
                ← Finance
              </Link>
              <Link href="/audit" style={{ fontSize: 13, color: '#0081cc', fontWeight: 600 }}>
                Audit log →
              </Link>
            </XStack>
          </YStack>

          <YStack gap={8}>
            <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
              <Text fontSize={18} fontWeight="700">
                Revenue analytics
              </Text>
              <XStack gap={8} alignItems="center">
                <Text fontSize={12} opacity={0.6}>
                  Range:
                </Text>
                {MONTH_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setMonthsBack(n)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: monthsBack === n ? '#0081cc' : 'var(--bg-elevated)',
                      color: monthsBack === n ? 'white' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {n} mo
                  </button>
                ))}
              </XStack>
            </XStack>
            {revenue === undefined ? (
              <Text fontSize={13} opacity={0.6}>
                Loading revenue analytics…
              </Text>
            ) : months.length === 0 ? (
              <Text fontSize={13} opacity={0.6}>
                No revenue data in this range.
              </Text>
            ) : (
              <YStack gap={8}>
                {months.map((m: any) => (
                  <YStack key={m.month} gap={2}>
                    <XStack justifyContent="space-between">
                      <Text fontSize={12} fontWeight="600">
                        {m.month}
                      </Text>
                      <Text fontSize={12} opacity={0.6}>
                        gross {formatAed(m.grossCents)} · refunded {formatAed(m.refundedCents)} ·
                        net {formatAed(m.netCents)} · {m.succeededCount} payments
                      </Text>
                    </XStack>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 6,
                        background: 'var(--bg-muted)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(0, (m.netCents / maxNet) * 100)}%`,
                          height: '100%',
                          background: '#0081cc',
                        }}
                      />
                    </div>
                  </YStack>
                ))}
                <Text
                  fontSize={13}
                  fontWeight="600"
                  color="#0081cc"
                  cursor="pointer"
                  onPress={() => downloadCsv(`revenue-${monthsBack}mo`, months)}
                >
                  Export CSV
                </Text>
              </YStack>
            )}
          </YStack>

          <YStack gap={8}>
            <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
              <Text fontSize={18} fontWeight="700">
                Profit & loss
              </Text>
              <XStack gap={8}>
                {WINDOW_OPTIONS.map((w) => (
                  <button
                    key={w.days}
                    onClick={() => setWindowDays(w.days)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: windowDays === w.days ? '#0081cc' : 'var(--bg-elevated)',
                      color: windowDays === w.days ? 'white' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {w.label}
                  </button>
                ))}
              </XStack>
            </XStack>
            {p ? (
              <YStack gap={4}>
                <Text fontSize={13}>Gross collected: {formatAed(p.grossCents)}</Text>
                <Text fontSize={13}>Refunded: −{formatAed(p.refundedCents)}</Text>
                <Text fontSize={13}>Payouts issued: −{formatAed(p.payoutsCents)}</Text>
                <Text fontSize={16} fontWeight="800">
                  Net: {formatAed(p.netCents)}
                </Text>
                <Text fontSize={12} opacity={0.6}>
                  {p.succeededCount} succeeded · {p.refundedCount} refunded · {p.payoutsCount}{' '}
                  payouts
                  {p.byType && Object.keys(p.byType).length > 0
                    ? ` · by type: ${Object.entries(p.byType)
                        .map(([t, c]) => `${t} ${formatAed(c as number)}`)
                        .join(', ')}`
                    : ''}
                </Text>
                <Text
                  fontSize={13}
                  fontWeight="600"
                  color="#0081cc"
                  cursor="pointer"
                  onPress={() => downloadCsv(`pnl-${windowDays}d`, [p])}
                >
                  Export CSV
                </Text>
              </YStack>
            ) : (
              <Text fontSize={13} opacity={0.6}>
                Loading profit & loss…
              </Text>
            )}
          </YStack>

          <YStack gap={8}>
            <Text fontSize={18} fontWeight="700">
              Retention projections
            </Text>
            {r ? (
              <YStack gap={4}>
                <Text fontSize={13}>
                  Active memberships: {r.activeCount} · trials: {r.trialCount} · auto-renew:{' '}
                  {r.autoRenewCount}
                </Text>
                {(['next_30d', 'next_60d', 'next_90d'] as const).map((k) => (
                  <Text key={k} fontSize={13}>
                    Expiring {k.replace('next_', '').replace('d', ' days')}:{' '}
                    {r.expiring[k].count} memberships · projected{' '}
                    {formatAed(r.expiring[k].projectedCents)}
                  </Text>
                ))}
                {r.byStatus && Object.keys(r.byStatus).length > 0 && (
                  <Text fontSize={12} opacity={0.6}>
                    Status mix:{' '}
                    {Object.entries(r.byStatus)
                      .map(([s, c]) => `${s}: ${c}`)
                      .join(' · ')}
                  </Text>
                )}
              </YStack>
            ) : (
              <Text fontSize={13} opacity={0.6}>
                Loading retention projections…
              </Text>
            )}
          </YStack>
        </YStack>
      </AdminShell>
    </RequireAuth>
  );
}
