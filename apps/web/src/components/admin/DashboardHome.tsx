'use client';

import React, { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { Users, DollarSign, Activity, Dumbbell } from 'lucide-react';
import { ScannerHealthPanel } from '../dashboard/ScannerHealthPanel';
import { OccupancySection, ClassesNowSection, RecentCheckins } from '../dashboard/LiveFloor';
import { QueryBoundary, EmptyState, Skeleton, Card, formatMoney, formatTime } from './QueryBoundary';
import { RevenueChart, GrowthChart } from './charts';
import { ScopeNote } from './BranchSwitcher';
import { canOpen, useSessionRoles } from '@/lib/access';

/**
 * Admin dashboard home — every widget reads a real Convex query:
 * - KPIs: queries/memberships:getOwnerKPIs
 * - Revenue graph: queries/finance:getLedger (succeeded payments, last 14d)
 * - Membership mix: queries/users:getMembersDirectory (status buckets)
 * - Occupancy + in-gym: queries/access:getCurrentOccupancy + getRecentAccessEvents
 * - Classes now: queries/access:getOperationsLiveStatus
 * Where the backend has no supporting data, widgets render an honest
 * empty state instead of placeholder numbers.
 */
export function DashboardHome() {
  // Revenue reads the finance-only ledger; operations sees the rest of the floor.
  const finance = canOpen(useSessionRoles(), '/finance');
  const today = new Date().toLocaleDateString('en-AE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>{today} · Queenix Gym</p>
      </div>

      <ScopeNote />

      <QueryBoundary fallback={<EmptyState message="KPIs unavailable — sign in with a staff account." />}>
        <KpiCards />
      </QueryBoundary>

      <div className="admin-cols-2">
        {finance && (
          <QueryBoundary fallback={<EmptyState message="Revenue data unavailable." />}>
            <RevenueSection />
          </QueryBoundary>
        )}
        <QueryBoundary fallback={<EmptyState message="Membership data unavailable." />}>
          <MembershipSection />
        </QueryBoundary>
      </div>

      <div className="admin-cols-2">
        <QueryBoundary fallback={<EmptyState message="Occupancy data unavailable." />}>
          <OccupancySection />
        </QueryBoundary>
        <QueryBoundary fallback={<EmptyState message="Class schedule unavailable." />}>
          <ClassesNowSection />
        </QueryBoundary>
      </div>

      <QueryBoundary fallback={<EmptyState message="Recent check-ins unavailable." />}>
        <RecentCheckins />
      </QueryBoundary>

      <QueryBoundary fallback={<EmptyState message="Scanner health unavailable." />}>
        <ScannerHealthPanel />
      </QueryBoundary>
    </div>
  );
}

function KpiCards() {
  const kpis = useQuery(api.queries.memberships.getOwnerKPIs, {});
  if (kpis === undefined) return <Skeleton height={118} />;
  const cards = [
    { label: 'Active members', value: String(kpis.activeMemberCount), icon: Users, color: '#0081cc' },
    { label: "Today's revenue", value: formatMoney(kpis.todaysRevenueCents), icon: DollarSign, color: '#10b981' },
    { label: "Today's check-ins", value: String(kpis.todaysCheckInCount), icon: Activity, color: '#8b5cf6' },
    { label: 'Live occupancy', value: String(kpis.currentOccupancy), icon: Dumbbell, color: '#f59e0b' },
  ];
  return (
    <div className="admin-kpi-grid">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 18,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${c.color}20`,
                color: c.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Icon size={18} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{c.value}</div>
          </div>
        );
      })}
    </div>
  );
}

function RevenueSection() {
  const ledger = useQuery(api.queries.finance.getLedger, { limit: 500 });
  // Stable 14-day window bucketed to the hour: Date.now() inline would mint
  // new {from,to} args on every render, resubscribing the Convex query in a
  // render loop ("Maximum update depth exceeded").
  const window = useMemo(() => {
    const to = Math.floor(Date.now() / 3600000) * 3600000;
    return { from: to - 14 * 24 * 60 * 60 * 1000, to };
  }, []);
  const venues = useQuery((api as any).queries.commerceOps.getCommerceSummary, window);
  if (ledger === undefined) return <Skeleton height={280} />;
  const succeeded = ledger.filter((p) => p.status === 'succeeded');
  const currency = modeOf(succeeded.map((p) => p.currency)) ?? 'AED';

  const days: { key: string; label: string; start: number; cents: number }[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = d.getTime() + 24 * 60 * 60 * 1000;
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' }),
      start: d.getTime(),
      cents: 0,
    });
    void next;
  }
  const firstDay = days[0];
  const dayStart = firstDay ? firstDay.start : 0;
  for (const p of succeeded) {
    if (p.createdAt < dayStart) continue;
    const idx = Math.floor((p.createdAt - dayStart) / (24 * 60 * 60 * 1000));
    const bucket = idx >= 0 && idx < days.length ? days[idx] : undefined;
    if (bucket) bucket.cents += p.amountCents;
  }
  const total = days.reduce((s, d) => s + d.cents, 0);

  return (
    <Card title="Revenue — last 14 days" action={<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ledger.length} ledger rows scanned</span>}>
      {succeeded.length === 0 ? (
        <EmptyState message="No succeeded payments recorded yet." />
      ) : (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{formatMoney(total, currency)}</div>
          <RevenueChart points={days} currency={currency} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            {venues === undefined
              ? 'Loading venue sales…'
              : `+ venues (14d): coffee ${formatMoney(venues.coffee?.grossCents ?? 0, currency)} · salon ${formatMoney(venues.salon?.grossCents ?? 0, currency)}`}
          </div>
        </>
      )}
    </Card>
  );
}

function MembershipSection() {
  const members = useQuery(api.queries.users.getMembersDirectory, { status: 'all', limit: 500 });
  if (members === undefined) return <Skeleton height={280} />;
  const total = members.length;

  // Monthly growth over the last 12 months, bucketed by account creation.
  // Members created before the window seed the starting cumulative total.
  const now = new Date();
  const months: { key: string; label: string; start: number; end: number; joined: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('en-AE', { month: 'short' }),
      start: d.getTime(),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
      joined: 0,
    });
  }
  for (const m of members) {
    const t = m.user?._creationTime ?? 0;
    const bucket = months.find((mm) => t >= mm.start && t < mm.end);
    if (bucket) bucket.joined += 1;
  }
  let running = total - months.reduce((s, mm) => s + mm.joined, 0);
  const points = months.map((mm) => {
    running += mm.joined;
    return { key: mm.key, label: mm.label, value: running };
  });
  const joinedThisMonth = months[months.length - 1]?.joined ?? 0;

  return (
    <Card
      title="Total members"
      action={
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {joinedThisMonth > 0 ? `+${joinedThisMonth} this month` : 'last 12 months'}
        </span>
      }
    >
      {total === 0 ? (
        <EmptyState message="No member records found." />
      ) : (
        <>
          <div style={{ fontSize: 34, fontWeight: 800, marginBottom: 2 }}>{total.toLocaleString('en-AE')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            {joinedThisMonth > 0
              ? `${joinedThisMonth} joined ${months[months.length - 1]?.label ?? 'this month'}`
              : 'No new joins this month yet'}
          </div>
          <GrowthChart points={points} />
        </>
      )}
    </Card>
  );
}

function modeOf(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}
