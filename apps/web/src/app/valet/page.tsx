'use client';
/**
 * Web — Valet ops: live queue + capacity + throughput.
 * Wired to the real valet queries/mutations (no invented paths).
 */
import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@queenix/convex';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminShell } from '@/components/admin/AdminShell';

type Status = 'reserved' | 'checked_in' | 'completed' | 'cancelled';
const TABS: Array<Status | 'all'> = ['all', 'reserved', 'checked_in', 'completed', 'cancelled'];


const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 16,
};

export default function ValetPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('all');
  const queue = useQuery(
    api.queries.valet.opsQueue,
    tab === 'all' ? {} : { status: tab as Status }
  );
  const counts = useQuery(api.queries.valet.slotCounts, {});
  const checkIn = useMutation(api.mutations.valet.checkIn);
  const handOver = useMutation(api.mutations.valet.handOver);

  const rows = queue ?? [];
  const doneToday = rows.filter((r: any) => r.status === 'completed').length;

  return (
    <RequireAuth>
      <AdminShell>
      <div>

        <h1 style={{ color: 'var(--text)' }}>Valet queue</h1>

        <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active cars</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
              {counts
                ? `${counts.active} (${counts.reserved} reserved, ${counts.checkedIn} checked in)`
                : 'Loading…'}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Completed (this view)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
              {queue === undefined ? '…' : doneToday}
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: tab === t ? 'var(--brand)' : 'var(--bg-elevated)',
                color: tab === t ? '#fff' : 'var(--text)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {t}
            </button>
          ))}
        </div>
        {!queue ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No cars in this view.</p>
        ) : (
          <div style={{ overflowX: 'auto', ...card, padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: 12, color: 'var(--text)' }}>Plate</th>
                  <th style={{ padding: 12, color: 'var(--text)' }}>Status</th>
                  <th style={{ padding: 12, color: 'var(--text)' }}>ETA (min)</th>
                  <th style={{ padding: 12, color: 'var(--text)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 12, fontWeight: 600, color: 'var(--text)' }}>{r.plate}</td>
                    <td style={{ padding: 12, color: 'var(--text)' }}>{r.status}</td>
                    <td style={{ padding: 12, color: 'var(--text)' }}>{r.etaMin}</td>
                    <td style={{ padding: 12, display: 'flex', gap: 8 }}>
                      {r.status === 'reserved' && (
                        <button onClick={() => checkIn({ reservationId: r._id })}>Check in</button>
                      )}
                      {r.status === 'checked_in' && (
                        <button onClick={() => handOver({ reservationId: r._id })}>Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
    </RequireAuth>
  );
}
