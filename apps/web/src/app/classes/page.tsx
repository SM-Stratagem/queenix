'use client';
/**
 * Web — Classes overview: upcoming schedule + today's roster.
 * Read-only ops view wired to the real class queries.
 */
import { useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminShell } from '@/components/admin/AdminShell';
import { downloadCsv } from '../../components/finance/CsvExport';


const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 16,
};

export default function WebClassesPage() {
  const upcoming = useQuery(api.queries.classes.getUpcomingClasses, { limit: 20 });
  const today = useQuery(api.queries.classes.getTodayRoster, {});

  return (
    <RequireAuth>
      <AdminShell>
      <div>

        <h1 style={{ color: 'var(--text)' }}>Classes overview</h1>

        <section style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ color: 'var(--text)', margin: 0 }}>Today&apos;s roster</h2>
            {(today ?? []).length > 0 && (
              <button
                onClick={() =>
                  downloadCsv(
                    'classes-roster-today',
                    (today ?? []).flatMap((c: any) =>
                      (c.rosterPreview ?? []).length > 0
                        ? (c.rosterPreview ?? []).map((r: any) => ({
                            class: c.classType?.name ?? 'Class',
                            startsAt: new Date(c.startsAt).toISOString(),
                            trainer: c.trainer?.fullName ?? '',
                            member: r.user?.fullName ?? 'Member',
                          }))
                        : [{ class: c.classType?.name ?? 'Class', startsAt: new Date(c.startsAt).toISOString(), trainer: c.trainer?.fullName ?? '', member: '' }]
                    )
                  )
                }
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                Export CSV
              </button>
            )}
          </div>
          {today === undefined ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : today.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No classes scheduled for today.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {today.map((c: any) => (
                <div key={String(c._id)} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                    {c.classType?.name ?? 'Class'} · {new Date(c.startsAt).toLocaleTimeString()}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Trainer: {c.trainer?.fullName ?? 'TBA'} · {c.bookedCount ?? c.rosterPreview?.length ?? 0}/
                    {c.capacity ?? '?'} booked
                  </div>
                  {(c.rosterPreview ?? []).length > 0 && (
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>
                      {c.rosterPreview.map((r: any) => r.user?.fullName ?? 'Member').join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={card}>
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Upcoming classes</h2>
          {upcoming === undefined ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : upcoming.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No upcoming classes scheduled.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {upcoming.map((c: any) => (
                <div key={String(c._id)} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                    {c.classType?.name ?? 'Class'} · {new Date(c.startsAt).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {c.classType?.category ?? ''} · {c.classType?.difficulty ?? ''} ·{' '}
                    {c.classType?.durationMinutes ?? '?'} min · Trainer: {c.trainer?.fullName ?? 'TBA'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
    </RequireAuth>
  );
}
