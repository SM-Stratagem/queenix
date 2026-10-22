'use client';

/** Live floor widgets: occupancy, classes running now, recent check-ins. */
import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { EmptyState, Skeleton, Card, formatTime } from '../admin/QueryBoundary';

export function OccupancySection() {
  const snapshot = useQuery(api.queries.access.getCurrentOccupancy, {});
  const events = useQuery(api.queries.access.getRecentAccessEvents, { limit: 50 });
  if (snapshot === undefined || events === undefined) return <Skeleton height={240} />;

  // Members currently in gym: latest event per user within the 24h window,
  // counting only granted "in" events (schema/access:accessEvents).
  const latest = new Map<string, (typeof events)[number]>();
  for (const e of [...events].sort((a, b) => a.timestamp - b.timestamp)) {
    // Unknown-pass scans have no userId (denied, never "in gym").
    if (e.userId) latest.set(String(e.userId), e);
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

export function ClassesNowSection() {
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

export function RecentCheckins() {
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
                  <td style={{ padding: '10px 0', fontSize: 14, fontWeight: 500 }}>
                    {e.user?.fullName ?? (e.userId ? 'Unknown member' : 'Unknown pass')}
                    {!e.granted && e.reason && (
                      <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--danger)' }}>{e.reason}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: !e.granted ? '#ef444420' : e.direction === 'in' ? '#10b98120' : '#0081cc20',
                        color: !e.granted ? 'var(--danger)' : e.direction === 'in' ? 'var(--success)' : 'var(--brand)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {e.direction}{e.granted ? '' : ': denied'}
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
