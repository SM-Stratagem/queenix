'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminShell } from '@/components/admin/AdminShell';

const adminApi = api as any;


export default function PromotionsPage() {
  const stats = useQuery(adminApi.queries.promotionsAdmin.referralStats, {});
  const referrals = useQuery(adminApi.queries.promotionsAdmin.recentReferrals, { limit: 50 });
  const outreach = useQuery(adminApi.queries.promotionsAdmin.promoOutreach, { limit: 20 });

  return (
    <RequireAuth>
      <AdminShell>
      <div>
        <h1>Promotions</h1>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 16px' }}>Referral funnel, loyalty rewards granted, promo outreach (staff only).</p>

        {!stats ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading stats…</p>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            {([['Referral codes', stats.total], ['Pending', stats.pending], ['Converted', stats.converted], ['Expired', stats.expired], ['Reward points granted', stats.rewardPointsGranted]] as const).map(([k, v]) => (
              <div key={k} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', background: 'var(--bg-elevated)' }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k}</div>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ fontSize: 17, marginBottom: 8 }}>Recent referrals</h2>
        {!referrals ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
        ) : referrals.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No referral codes issued yet. Members create codes from the mobile app.</p>
        ) : (
          <div style={{ overflowX: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Code</th>
                  <th style={{ padding: 8 }}>Referrer</th>
                  <th style={{ padding: 8 }}>Referee</th>
                  <th style={{ padding: 8 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r: any) => (
                  <tr key={r._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{r.code}</td>
                    <td style={{ padding: 8 }}>{r.referrerName ?? '—'}</td>
                    <td style={{ padding: 8 }}>{r.refereeName ?? '—'}</td>
                    <td style={{ padding: 8 }}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 style={{ fontSize: 17, marginBottom: 8 }}>Promo outreach</h2>
        {!outreach ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
        ) : outreach.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No promotion notifications sent yet. There is no campaign composer in the backend yet — this list will populate once promo notifications are issued.</p>
        ) : (
          <ul style={{ fontSize: 14, paddingLeft: 18, display: 'grid', gap: 6 }}>
            {outreach.map((n: any) => (
              <li key={n._id}><strong>{n.title}</strong> — {n.body} <span style={{ color: 'var(--text-muted)' }}>· {new Date(n.createdAt).toLocaleString()}</span></li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
    </RequireAuth>
  );
}
