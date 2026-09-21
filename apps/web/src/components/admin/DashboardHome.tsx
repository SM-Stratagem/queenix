'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { Users, DollarSign, Activity, Dumbbell } from 'lucide-react';
import { ScannerHealthPanel } from '../dashboard/ScannerHealthPanel';
import { QueryBoundary, EmptyState, Skeleton, Card, formatMoney, formatTime } from './QueryBoundary';
import { RevenueChart, GrowthChart } from './charts';
import { ScopeNote } from './BranchSwitcher';

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
        <QueryBoundary fallback={<EmptyState message="Revenue data unavailable." />}>
          <RevenueSection />
        </QueryBoundary>
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

      <ScannerHealthPanel />
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
  const nowTs = Date.now();
  const fortnightAgo = nowTs - 14 * 24 * 60 * 60 * 1000;
  const venues = useQuery((api as any).queries.commerceOps.getCommerceSummary, { from: fortnightAgo, to: nowTs });
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

function OccupancySection() {
  const snapshot = useQuery(api.queries.access.getCurrentOccupancy, {});
  const events = useQuery(api.queries.access.getRecentAccessEvents, { limit: 50 });
  if (snapshot === undefined || events === undefined) return <Skeleton height={240} />;

  // Members currently in gym: latest event per user within the 24h window,
  // counting only granted "in" events (schema/access:accessEvents).
  const latest = new Map<string, (typeof events)[number]>();
  for (const e of [...events].sort((a, b) => a.timestamp - b.timestamp)) {
    latest.set(e.userId as unknown as string, e);
  }
  const inGym = [...latest.values()].filter((e) => e.direction === 'in' && e.granted);

  return (
    <Card
      title="Live occupancy"
      action={
        snapshot ? (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            snapshot {formatTime(snapshot.timestamp)}
          </span>
        ) : undefined
      }
    >
      {snapshot == null && inGym.length === 0 ? (
        <EmptyState message="No occupancy snapshot or access events in the last 24 hours." />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 34, fontWeight: 800 }}>{snapshot?.count ?? 0}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              in gym now · {inGym.length} active {inGym.length === 1 ? 'member' : 'members'} (last 24h events)
            </span>
          </div>
          {inGym.length === 0 ? (
            <EmptyState message="Nobody currently checked in according to recent access events." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inGym.slice(0, 8).map((e) => (
                <div key={String(e._id)} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: 'var(--success)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 600, flex: 1 }}>{e.user?.fullName ?? 'Unknown member'}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>in · {formatTime(e.timestamp)}</span>
                </div>
              ))}
              {inGym.length > 8 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>+{inGym.length - 8} more in gym</span>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function ClassesNowSection() {
  const live = useQuery(api.queries.access.getOperationsLiveStatus, {});
  if (live === undefined) return <Skeleton height={240} />;
  const now = Date.now();
  const happening = live.classes.filter((c) => c.startsAt <= now && c.endsAt >= now && c.status !== 'cancelled');
  const upcoming = live.classes
    .filter((c) => c.startsAt > now && c.status !== 'cancelled')
    .sort((a, b) => a.startsAt - b.startsAt)
    .slice(0, 5);

  return (
    <Card
      title="Classes happening now"
      action={
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {live.openIncidentsCount} open {live.openIncidentsCount === 1 ? 'incident' : 'incidents'} · {live.activeShifts.length} on shift
        </span>
      }
    >
      {happening.length === 0 ? (
        <EmptyState message="No class in session right now." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {happening.map((c) => (
            <ClassRow key={String(c._id)} name={c.classType?.name ?? 'Class'} meta={classMeta(c)} booked={c.bookedCount} capacity={c.capacity} live />
          ))}
        </div>
      )}
      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '12px 0 8px' }}>
            Up next today
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map((c) => (
              <ClassRow key={String(c._id)} name={c.classType?.name ?? 'Class'} meta={classMeta(c)} booked={c.bookedCount} capacity={c.capacity} />
            ))}
          </div>
        </>
      )}
      {happening.length === 0 && upcoming.length === 0 && (
        <EmptyState message="No more classes scheduled for today." />
      )}
    </Card>
  );
}

function classMeta(c: { startsAt: number; endsAt: number; roomId?: string | null }): string {
  const room = c.roomId ? ` · Room ${c.roomId}` : '';
  return `${formatTime(c.startsAt)}–${formatTime(c.endsAt)}${room}`;
}

function ClassRow({ name, meta, booked, capacity, live: isLive }: { name: string; meta: string; booked: number; capacity: number; live?: boolean }) {
  const pct = capacity > 0 ? Math.min(100, (booked / capacity) * 100) : 0;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        background: 'var(--bg-muted)',
        borderRadius: 10,
      }}
    >
      {isLive && (
        <span style={{ fontSize: 10, fontWeight: 800, color: 'white', background: 'var(--danger)', borderRadius: 999, padding: '2px 8px' }}>
          LIVE
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{meta}</div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700 }}>
        {booked}/{capacity}
      </span>
      <div style={{ width: 56, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? 'var(--warning)' : 'var(--brand)' }} />
      </div>
    </div>
  );
}

function RecentCheckins() {
  const events = useQuery(api.queries.access.getRecentAccessEvents, { limit: 12 });
  if (events === undefined) return <Skeleton height={180} />;
  return (
    <Card title="Recent check-ins">
      {events.length === 0 ? (
        <EmptyState message="No access events in the last 24 hours." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr>
                {['Member', 'Direction', 'Access point', 'Time'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '8px 0',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={String(e._id)} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 0', fontSize: 14, fontWeight: 500 }}>{e.user?.fullName ?? 'Unknown'}</td>
                  <td style={{ padding: '10px 0' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: e.direction === 'in' ? '#10b98120' : '#0081cc20',
                        color: e.direction === 'in' ? 'var(--success)' : 'var(--brand)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {e.direction}{e.granted ? '' : ' · denied'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 0', fontSize: 13, color: 'var(--text-muted)' }}>{e.accessPointId}</td>
                  <td style={{ padding: '10px 0', fontSize: 13, color: 'var(--text-muted)' }}>{formatTime(e.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
