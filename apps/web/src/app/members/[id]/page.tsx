'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@queenix/convex';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminShell } from '@/components/admin/AdminShell';

const adminApi = api as any;

export default function MemberDetailPage() {
  const params = useParams();
  const memberId = params?.id as string | undefined;
  const detail = useQuery(
    api.queries.users.getOwnerMemberDetail,
    memberId ? { memberId: memberId as any } : 'skip'
  );
  const view360 = useQuery(
    api.queries.crm.member360,
    memberId ? { userId: memberId as any } : 'skip'
  );
  const freeze = useMutation(adminApi.mutations.membershipAdmin.freezeAnyMembership);
  const unfreeze = useMutation(adminApi.mutations.membershipAdmin.unfreezeAnyMembership);
  const cancel = useMutation(adminApi.mutations.membershipAdmin.cancelAnyMembership);
  const [days, setDays] = useState('14');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>, label: string) => {
    setMsg(null);
    try {
      await fn();
      setMsg(`${label} done.`);
    } catch (e: any) {
      setMsg(e?.data?.message ?? e?.message ?? `${label} failed.`);
    }
  };

  return (
    <RequireAuth>
      <AdminShell>
      <div>
        <Link href="/members" style={{ color: 'var(--brand)', fontSize: 13 }}>← Members</Link>
        {!detail ? (
          <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Loading member…</p>
        ) : !detail.member ? (
          <p style={{ marginTop: 16 }}>Member not found.</p>
        ) : (
          <>
            <h1 style={{ marginTop: 8 }}>{detail.member.fullName}</h1>
            <p style={{ color: 'var(--text-muted)' }}>{detail.member.email}{detail.member.phone ? ` · ${detail.member.phone}` : ''}</p>
            {view360 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', background: 'var(--bg-elevated)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Lifetime value</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{((view360.lifetimePaidCents ?? 0) / 100).toLocaleString()} AED</div>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', background: 'var(--bg-elevated)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Open CRM tasks</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{view360.openTaskCount ?? 0}</div>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', background: 'var(--bg-elevated)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Memberships</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{detail.memberships.length}</div>
                </div>
              </div>
            )}

            <h2 style={{ fontSize: 17, margin: '20px 0 8px' }}>Memberships</h2>
            {detail.memberships.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No memberships on record.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {detail.memberships.map((m: any) => (
                  <div key={m._id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--bg-elevated)', fontSize: 14 }}>
                    <div style={{ fontWeight: 700 }}>{m.status} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· ends {new Date(m.endDate).toLocaleDateString()}</span></div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Classes left: {m.remainingClasses} · PT left: {m.remainingPTSessions} · auto-renew: {m.autoRenew ? 'on' : 'off'}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {m.status === 'active' && (
                        <>
                          <input value={days} onChange={(e) => setDays(e.target.value)} placeholder="days" style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason (optional)" style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', minWidth: 160 }} />
                          <button onClick={() => run(() => freeze({ membershipId: m._id, days: Number(days), reason: reason || undefined }), 'Freeze')} style={btn}>Freeze</button>
                          <button onClick={() => { if (confirm('Cancel this membership?')) run(() => cancel({ membershipId: m._id }), 'Cancel'); }} style={btn}>Cancel</button>
                        </>
                      )}
                      {m.status === 'frozen' && (
                        <button onClick={() => run(() => unfreeze({ membershipId: m._id }), 'Unfreeze')} style={btn}>Unfreeze</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {msg && <p style={{ marginTop: 8, fontSize: 13 }}>{msg}</p>}

            <h2 style={{ fontSize: 17, margin: '20px 0 8px' }}>Recent payments</h2>
            {detail.payments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No payments recorded.</p>
            ) : (
              <ul style={{ fontSize: 14, display: 'grid', gap: 6, paddingLeft: 18 }}>
                {detail.payments.map((p: any) => (
                  <li key={p._id}>{p.description} — {(p.amountCents / 100).toLocaleString()} {p.currency} ({p.status})</li>
                ))}
              </ul>
            )}

            <h2 style={{ fontSize: 17, margin: '20px 0 8px' }}>Recent visits</h2>
            {detail.visits.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No check-ins recorded.</p>
            ) : (
              <ul style={{ fontSize: 14, display: 'grid', gap: 6, paddingLeft: 18 }}>
                {detail.visits.map((v: any) => (
                  <li key={v._id}>{new Date(v.timestamp).toLocaleString()} — {v.direction}</li>
                ))}
              </ul>
            )}

            {(view360?.profile ?? detail.profile) && (
              <>
                <h2 style={{ fontSize: 17, margin: '20px 0 8px' }}>Profile</h2>
                <ProfileFields profile={(view360?.profile ?? detail.profile) as any} />
              </>
            )}
          </>
        )}
      </div>
    </AdminShell>
    </RequireAuth>
  );
}

const btn: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 };

/** Structured member profile — date of birth, emergency contact, vehicles, preferences. */
function ProfileFields({ profile }: { profile: any }) {
  const rows: Array<[string, string]> = [];
  if (profile.dateOfBirth) rows.push(['Date of birth', String(profile.dateOfBirth)]);
  if (profile.gender) rows.push(['Gender', String(profile.gender)]);
  if (profile.emergencyContact) {
    const ec = profile.emergencyContact;
    rows.push(['Emergency contact', `${ec.name} · ${ec.phone}${ec.relationship ? ` (${ec.relationship})` : ''}`]);
  }
  if (Array.isArray(profile.vehicles) && profile.vehicles.length > 0) {
    rows.push([
      'Vehicles',
      profile.vehicles.map((v: any) => [v.plate, v.make, v.model, v.color].filter(Boolean).join(' ')).join(' · '),
    ]);
  }
  if (profile.preferences) {
    const p = profile.preferences;
    const langs = p.language === 'ar' ? 'Arabic' : 'English';
    rows.push([
      'Preferences',
      `${langs} · notifications ${p.notifications ? 'on' : 'off'} · marketing ${p.marketing ? 'on' : 'off'}`,
    ]);
  }
  if (rows.length === 0) return <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No profile details on file.</p>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', gap: 12, fontSize: 14 }}>
          <span style={{ width: 150, flexShrink: 0, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}
