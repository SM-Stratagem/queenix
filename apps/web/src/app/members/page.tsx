'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@queenix/convex';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminShell } from '@/components/admin/AdminShell';
import { downloadCsv } from '../../components/finance/CsvExport';

// New convex modules are not in the generated api.d.ts until `convex dev`
// codegen runs against a live deployment; access them untyped so
// `tsc --noEmit` stays green. Runtime resolution is by file path.
const adminApi = api as any;


const STATUS_TABS = ['all', 'active', 'trial', 'frozen', 'pending', 'expired', 'cancelled'] as const;

function fmtMoney(cents: number, currency: string) {
  return `${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`;
}

function Directory() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>('all');
  const rows = useQuery(api.queries.users.getMembersDirectory, {
    search: search || undefined,
    status,
    limit: 50,
  });

  return (
    <section>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', minWidth: 240 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)', background: status === s ? 'var(--brand)' : 'var(--bg-elevated)', color: status === s ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: 13 }}
            >
              {s}
            </button>
          ))}
          {(rows ?? []).length > 0 && (
            <button
              onClick={() =>
                downloadCsv(
                  `members-${status}`,
                  (rows ?? []).map((r: any) => ({
                    name: r.user.fullName,
                    email: r.user.email,
                    phone: r.user.phone ?? '',
                    status: r.membership?.status ?? '',
                  }))
                )
              }
              style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              Export CSV
            </button>
          )}
        </div>
      </div>
      {!rows ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading members…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No members match this filter.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: 8 }}>Member</th>
                <th style={{ padding: 8 }}>Contact</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.user._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 8, fontWeight: 600 }}>{r.user.fullName}</td>
                  <td style={{ padding: 8, color: 'var(--text-muted)' }}>{r.user.email}{r.user.phone ? ` · ${r.user.phone}` : ''}</td>
                  <td style={{ padding: 8 }}>{r.membership?.status ?? '—'}</td>
                  <td style={{ padding: 8 }}>
                    <Link href={`/members/${r.user._id}`} style={{ color: 'var(--brand)', fontWeight: 600 }}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Plans() {
  const plans = useQuery(adminApi.queries.membershipAdmin.listAllPlans, {});
  const stats = useQuery(adminApi.queries.membershipAdmin.membershipStats, {});
  const setActive = useMutation(adminApi.mutations.membershipAdmin.setPlanActive);
  const createPlan = useMutation(adminApi.mutations.membershipAdmin.createPlan);
  const [form, setForm] = useState({ name: '', description: '', price: '', durationDays: '30', maxClasses: '8', maxPT: '0' });
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);
    try {
      await createPlan({
        name: form.name,
        description: form.description || form.name,
        durationDays: Number(form.durationDays),
        priceCents: Math.round(Number(form.price) * 100),
        currency: 'AED',
        features: [],
        maxClassesPerMonth: Number(form.maxClasses),
        maxPTSessions: Number(form.maxPT),
      });
      setForm({ name: '', description: '', price: '', durationDays: '30', maxClasses: '8', maxPT: '0' });
      setMsg('Plan created.');
    } catch (e: any) {
      setMsg(e?.message ?? 'Failed to create plan.');
    }
  };

  return (
    <section>
      {stats && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {Object.entries(stats as Record<string, number>).map(([k, v]) => (
            <div key={k} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', background: 'var(--bg-elevated)' }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k}</div>
            </div>
          ))}
        </div>
      )}
      {!plans ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading plans…</p>
      ) : plans.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No membership plans yet — create the first one below.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', marginBottom: 24 }}>
          {plans.map((p: any) => (
            <div key={p._id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--bg-elevated)' }}>
              <div style={{ fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0' }}>{p.description}</div>
              <div style={{ fontWeight: 800, color: 'var(--brand)' }}>{fmtMoney(p.priceCents, p.currency)} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>/ {p.durationDays}d</span></div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {p.isActive ? 'Active' : 'Inactive'} · {p.maxClassesPerMonth} classes/mo · {p.maxPTSessions} PT
              </div>
              <button
                onClick={() => setActive({ planId: p._id, isActive: !p.isActive })}
                style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}
              >
                {p.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>New plan</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 720 }}>
        {([['name', 'Name'], ['description', 'Description'], ['price', 'Price (AED)'], ['durationDays', 'Duration (days)'], ['maxClasses', 'Classes/mo'], ['maxPT', 'PT sessions']] as const).map(([k, label]) => (
          <input
            key={k}
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            placeholder={label}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', width: 200 }}
          />
        ))}
        <button onClick={submit} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Create plan</button>
      </div>
      {msg && <p style={{ marginTop: 8, fontSize: 13 }}>{msg}</p>}
    </section>
  );
}

function MembershipMix() {
  const stats = useQuery(adminApi.queries.membershipAdmin.membershipStats, {}) as Record<string, number> | undefined;
  const cards = [
    { label: 'Members', value: stats?.totalUsers, hint: 'user accounts' },
    { label: 'Active membership', value: stats?.activeMemberships, hint: 'paying now' },
    { label: 'Trial', value: stats?.trial, hint: 'converting' },
    { label: 'Frozen', value: stats?.frozen, hint: 'paused' },
    { label: 'No membership', value: stats?.usersWithoutMembership, hint: 'to convert' },
  ];
  return (
    <div className="admin-kpi-grid" style={{ marginBottom: 16 }}>
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--brand)',
            borderRadius: 12,
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{c.label}</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{c.value ?? '…'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.hint}</div>
        </div>
      ))}
    </div>
  );
}

export default function MembersPage() {
  const [tab, setTab] = useState<'directory' | 'plans'>('directory');
  return (
    <RequireAuth>
      <AdminShell>
      <div>
        <h1>Members &amp; plans</h1>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 16px' }}>Directory, member detail, lifecycle (freeze / cancel), plan catalogue.</p>
        <MembershipMix />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['directory', 'plans'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: tab === t ? 'var(--brand)' : 'var(--bg-elevated)', color: tab === t ? '#fff' : 'var(--text)', cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>
        {tab === 'directory' ? <Directory /> : <Plans />}
      </div>
    </AdminShell>
    </RequireAuth>
  );
}
