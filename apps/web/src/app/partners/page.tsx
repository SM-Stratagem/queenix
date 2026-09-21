'use client';

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminShell } from '@/components/admin/AdminShell';


export default function PartnersPage() {
  const [status, setStatus] = useState<'pending' | 'paid' | 'cancelled' | undefined>(undefined);
  const payouts = useQuery(
    api.queries.finance.listPayouts,
    status ? { status, limit: 100 } : { limit: 100 }
  );

  return (
    <RequireAuth>
      <AdminShell>
      <div>
        <h1>Partners</h1>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 16px' }}>Trainer / partner payouts from the finance backend. There is no partner-directory table in the backend yet, so no directory is shown.</p>

        <div style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 14, color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
          Partner directory: not available — the backend has no partner or sponsorship tables, so this section shows payouts only. Directory management will appear once a partner entity exists.
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['all', 'pending', 'paid', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s === 'all' ? undefined : s)}
              style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)', background: (status ?? 'all') === s ? 'var(--brand)' : 'var(--bg-elevated)', color: (status ?? 'all') === s ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: 13 }}
            >
              {s}
            </button>
          ))}
        </div>

        {!payouts ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading payouts…</p>
        ) : payouts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No partner payouts in this view.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Payee</th>
                  <th style={{ padding: 8 }}>Amount</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p: any) => (
                  <tr key={p._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{p.recipientName ?? '—'}</td>
                    <td style={{ padding: 8 }}>{(p.amountCents / 100).toLocaleString()} {p.currency}</td>
                    <td style={{ padding: 8 }}>{p.status}</td>
                    <td style={{ padding: 8, color: 'var(--text-muted)' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
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
