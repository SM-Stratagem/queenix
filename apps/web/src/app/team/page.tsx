'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { api } from '@queenix/convex';
import { AdminShell } from '@/components/admin/AdminShell';
import { RequireAuth } from '@/components/RequireAuth';
import { OrgChart, type OrgNode } from '../../components/org/OrgChart';
import { downloadCsv } from '../../components/finance/CsvExport';

type Tab = 'chart' | 'timings' | 'permissions';

const ALL_ROLES = [
  'superadmin',
  'admin',
  'finance',
  'operations',
  'salon',
  'coffee',
  'trainer',
  'member',
] as const;

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 16,
};

const btnPrimary: React.CSSProperties = {
  background: 'var(--brand)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  color: 'var(--text)',
};

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  background: 'var(--bg)',
  color: 'var(--text)',
  width: '100%',
};

function fmtDay(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TeamPage() {
  const [tab, setTab] = useState<Tab>('chart');
  return (
    <RequireAuth>
      <AdminShell>
        <YStack gap={20} padding={24}>
          <YStack gap={4}>
            <Text fontSize={28} fontWeight="800">
              Team
            </Text>
            <Text fontSize={13} opacity={0.6}>
              Staff org chart · timings &amp; sick days · roles &amp; reporting lines
            </Text>
          </YStack>
          <XStack gap={8}>
            {(
              [
                ['chart', 'Org chart'],
                ['timings', 'Timings & time off'],
                ['permissions', 'Roles & permissions'],
              ] as Array<[Tab, string]>
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{
                  ...(k === tab ? btnPrimary : btnGhost),
                  ...(k === tab ? {} : { background: 'var(--bg-elevated)' }),
                }}
              >
                {label}
              </button>
            ))}
          </XStack>
          {tab === 'chart' && <ChartTab />}
          {tab === 'timings' && <TimingsTab />}
          {tab === 'permissions' && <PermissionsTab />}
        </YStack>
      </AdminShell>
    </RequireAuth>
  );
}

/* ---------------- Org chart (live) ---------------- */

function filterTree(node: OrgNode, q: string): OrgNode | null {
  const kids = node.children
    .map((c) => filterTree(c, q))
    .filter((c): c is OrgNode => c !== null);
  if (!q) return { ...node, children: kids };
  const hay = `${node.fullName} ${node.email} ${node.title ?? ''}`.toLowerCase();
  if (hay.includes(q) || kids.length > 0) return { ...node, children: kids };
  return null;
}

function ChartTab() {
  const [search, setSearch] = useState('');
  const tree = useQuery(api.queries.org.staffTree, {});
  if (tree === undefined) return <Text opacity={0.6}>Loading org chart…</Text>;
  if (tree.length === 0)
    return (
      <div style={card}>
        <Text fontSize={14} fontWeight="700">
          No staff yet
        </Text>
        <Text fontSize={13} opacity={0.6}>
          No users with a staff role exist. Grant a staff role under Roles &amp;
          permissions to build the chart.
        </Text>
      </div>
    );
  const q = search.trim().toLowerCase();
  const nodes = (tree as OrgNode[])
    .map((root) => filterTree(root, q))
    .filter((n): n is OrgNode => n !== null);
  return (
    <YStack gap={12}>
      <XStack>
        <Input
          placeholder="Search staff…"
          value={search}
          onChangeText={setSearch}
          width={220}
        />
      </XStack>
      <OrgChart nodes={nodes} />
    </YStack>
  );
}

/* ---------------- Timings & time off ---------------- */

function TimingsTab() {
  const timings = useQuery(api.queries.teamOrg.staffTimings, {});
  const timeOff = useQuery(api.queries.teamOrg.timeOffList, { status: 'all', limit: 100 });
  const recordTimeOff = useMutation(api.mutations.teamOrg.recordTimeOff);
  const decideTimeOff = useMutation(api.mutations.teamOrg.decideTimeOff);
  const [form, setForm] = useState({ userId: '', date: '', kind: 'sick', note: '' });
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await recordTimeOff({
        userId: form.userId as any,
        date: form.date,
        kind: form.kind as 'sick' | 'leave',
        note: form.note || undefined,
      });
      setForm({ userId: '', date: '', kind: 'sick', note: '' });
      setMsg('Recorded.');
    } catch (err: any) {
      setMsg(err?.message ?? 'Failed to record.');
    }
  }

  if (timings === undefined) return <Text opacity={0.6}>Loading timings…</Text>;
  const rows = timings as any[];
  const pending = ((timeOff ?? []) as any[]).filter((t) => t.record.status === 'pending');

  return (
    <YStack gap={16}>
      {pending.length > 0 && (
        <div style={card}>
          <Text fontSize={15} fontWeight="700">
            Pending requests ({pending.length})
          </Text>
          <YStack gap={8} marginTop={8}>
            {pending.map((t) => (
              <XStack key={t.record._id} gap={8} alignItems="center" flexWrap="wrap">
                <Text fontSize={13} flex={1} minWidth={200}>
                  {t.user?.fullName ?? 'Unknown'} · {t.record.kind} · {t.record.date}
                  {t.record.note ? ` — ${t.record.note}` : ''}
                </Text>
                <button
                  style={btnPrimary}
                  onClick={() => decideTimeOff({ timeOffId: t.record._id, decision: 'approved' })}
                >
                  Approve
                </button>
                <button
                  style={btnGhost}
                  onClick={() => decideTimeOff({ timeOffId: t.record._id, decision: 'denied' })}
                >
                  Deny
                </button>
              </XStack>
            ))}
          </YStack>
        </div>
      )}

      <div style={card}>
        <Text fontSize={15} fontWeight="700">
          Record sick day / leave
        </Text>
        <form onSubmit={submit}>
          <XStack gap={8} marginTop={8} flexWrap="wrap">
            <select
              required
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              style={{ ...inputStyle, maxWidth: 220 }}
            >
              <option value="">Select staff…</option>
              {rows.map((r) => (
                <option key={r.user._id} value={r.user._id}>
                  {r.user.fullName}
                </option>
              ))}
            </select>
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={{ ...inputStyle, maxWidth: 160 }}
            />
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
              style={{ ...inputStyle, maxWidth: 120 }}
            >
              <option value="sick">Sick</option>
              <option value="leave">Leave</option>
            </select>
            <input
              placeholder="Note (optional)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              style={{ ...inputStyle, maxWidth: 220 }}
            />
            <button type="submit" style={btnPrimary}>
              Record
            </button>
          </XStack>
        </form>
        {msg && (
          <Text fontSize={13} marginTop={8} opacity={0.7}>
            {msg}
          </Text>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {rows.length > 0 && (
          <button
            onClick={() =>
              downloadCsv(
                'staff-timings',
                rows.map((r: any) => ({
                  name: r.user.fullName,
                  role: r.user.activeRole,
                  title: r.profile?.title ?? '',
                  onShift: r.activeShift ? `yes (${r.activeShift.role})` : 'no',
                  recentShifts: (r.shifts ?? []).slice(0, 3).map((s: any) => `${fmtDay(s.startsAt)} [${s.status}]`).join(' | '),
                  timeOff: (r.timeOff ?? []).map((t: any) => `${t.date} (${t.kind}, ${t.status})`).join(' | '),
                }))
              )
            }
            style={btnGhost}
          >
            Export CSV
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div style={card}>
          <Text fontSize={13} opacity={0.6}>
            No staff found.
          </Text>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: 12 }}>Staff</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Recent shifts</th>
                <th style={{ padding: 12 }}>Sick / leave</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>{r.user.fullName}</div>
                    <div style={{ opacity: 0.6, fontSize: 12 }}>
                      {[r.profile?.title, r.user.activeRole].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>
                    {r.activeShift ? (
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                        On shift ({r.activeShift.role})
                      </span>
                    ) : (
                      <span style={{ opacity: 0.6 }}>Off shift</span>
                    )}
                  </td>
                  <td style={{ padding: 12, opacity: 0.8 }}>
                    {r.shifts.length === 0
                      ? '—'
                      : r.shifts
                          .slice(0, 3)
                          .map((s: any) => `${fmtDay(s.startsAt)} [${s.status}]`)
                          .join(' · ')}
                  </td>
                  <td style={{ padding: 12, opacity: 0.8 }}>
                    {r.timeOff.length === 0
                      ? '—'
                      : r.timeOff
                          .map((t: any) => `${t.date} (${t.kind}, ${t.status})`)
                          .join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </YStack>
  );
}

/* ---------------- Roles & permissions ---------------- */

function PermissionsTab() {
  const overview = useQuery(api.queries.teamOrg.rolesOverview, {});
  const directory = useQuery(api.queries.org.staffDirectory, {});
  const setRoles = useMutation(api.mutations.teamOrg.setStaffRoles);
  const upsertProfile = useMutation(api.mutations.teamOrg.upsertStaffProfile);
  const [selectedId, setSelectedId] = useState('');
  const [roles, setRolesState] = useState<string[]>([]);
  const [activeRole, setActiveRole] = useState('');
  const [profile, setProfile] = useState({ title: '', department: '', reportsToId: '' });
  const [msg, setMsg] = useState<string | null>(null);

  if (overview === undefined) return <Text opacity={0.6}>Loading roles…</Text>;
  const ov = overview as any;
  const staff = ov.staff as any[];
  const selected = staff.find((s) => String(s._id) === selectedId) ?? null;
  const dirEntry = ((directory ?? []) as any[]).find(
    (d) => String(d.user._id) === selectedId
  );

  function pick(id: string) {
    setSelectedId(id);
    const s = staff.find((x) => String(x._id) === id);
    setRolesState(s ? [...s.roles] : []);
    setActiveRole(s ? s.activeRole : '');
    const p = ((directory ?? []) as any[]).find((d) => String(d.user._id) === id)?.profile;
    setProfile({
      title: p?.title ?? '',
      department: p?.department ?? '',
      reportsToId: p?.reportsToId ? String(p.reportsToId) : '',
    });
    setMsg(null);
  }

  function toggleRole(r: string) {
    setRolesState((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  }

  async function saveRoles() {
    if (!selected) return;
    setMsg(null);
    try {
      await setRoles({
        userId: selected._id,
        roles: roles as any,
        activeRole: activeRole as any,
      });
      setMsg('Roles saved.');
    } catch (err: any) {
      setMsg(err?.message ?? 'Failed to save roles.');
    }
  }

  async function saveProfile() {
    if (!selected) return;
    setMsg(null);
    try {
      await upsertProfile({
        userId: selected._id,
        title: profile.title,
        department: profile.department,
        reportsToId: (profile.reportsToId || undefined) as any,
      });
      setMsg('Profile saved.');
    } catch (err: any) {
      setMsg(err?.message ?? 'Failed to save profile.');
    }
  }

  return (
    <YStack gap={16}>
      <div style={card}>
        <Text fontSize={15} fontWeight="700">
          Headcount by role
        </Text>
        <XStack gap={16} marginTop={8} flexWrap="wrap">
          {Object.keys(ov.headcount).length === 0 && (
            <Text fontSize={13} opacity={0.6}>
              No staff roles granted yet.
            </Text>
          )}
          {Object.entries(ov.headcount).map(([role, count]) => (
            <Text key={role} fontSize={13}>
              <strong>{role}</strong>: {String(count)}
            </Text>
          ))}
        </XStack>
      </div>

      <XStack gap={16} flexWrap="wrap" alignItems="flex-start">
        <div style={{ ...card, flex: 1, minWidth: 240 }}>
          <Text fontSize={15} fontWeight="700">
            Staff
          </Text>
          <YStack gap={4} marginTop={8}>
            {staff.map((s) => (
              <div
                key={String(s._id)}
                onClick={() => pick(String(s._id))}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background:
                    String(s._id) === selectedId ? 'var(--brand-light)' : 'transparent',
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 700 }}>{s.fullName}</div>
                <div style={{ opacity: 0.6, fontSize: 12 }}>
                  {s.activeRole} · {s.roles.join(', ')}
                </div>
              </div>
            ))}
          </YStack>
        </div>

        <div style={{ ...card, flex: 2, minWidth: 280 }}>
          {!selected ? (
            <Text fontSize={13} opacity={0.6}>
              Select a staff member to edit roles and profile.
            </Text>
          ) : (
            <YStack gap={12}>
              <Text fontSize={15} fontWeight="700">
                {selected.fullName}
              </Text>
              <div>
                <Text fontSize={13} fontWeight="700">
                  Granted roles
                </Text>
                <XStack gap={8} marginTop={4} flexWrap="wrap">
                  {ALL_ROLES.map((r) => (
                    <label key={r} style={{ fontSize: 13, display: 'flex', gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={roles.includes(r)}
                        onChange={() => toggleRole(r)}
                      />
                      {r}
                    </label>
                  ))}
                </XStack>
              </div>
              <div>
                <Text fontSize={13} fontWeight="700">
                  Active role
                </Text>
                <select
                  value={activeRole}
                  onChange={(e) => setActiveRole(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 200, marginTop: 4 }}
                >
                  <option value="">Select…</option>
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <button style={{ ...btnPrimary, alignSelf: 'flex-start' }} onClick={saveRoles}>
                Save roles
              </button>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <Text fontSize={13} fontWeight="700">
                  Staff profile (title · department · reports to)
                </Text>
                <XStack gap={8} marginTop={8} flexWrap="wrap">
                  <input
                    placeholder="Title"
                    value={profile.title}
                    onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                    style={{ ...inputStyle, maxWidth: 180 }}
                  />
                  <input
                    placeholder="Department"
                    value={profile.department}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    style={{ ...inputStyle, maxWidth: 180 }}
                  />
                  <select
                    value={profile.reportsToId}
                    onChange={(e) => setProfile({ ...profile, reportsToId: e.target.value })}
                    style={{ ...inputStyle, maxWidth: 200 }}
                  >
                    <option value="">No manager</option>
                    {staff
                      .filter((s) => String(s._id) !== selectedId)
                      .map((s) => (
                        <option key={String(s._id)} value={String(s._id)}>
                          {s.fullName}
                        </option>
                      ))}
                  </select>
                  <button style={btnGhost} onClick={saveProfile}>
                    Save profile
                  </button>
                </XStack>
                {dirEntry?.profile == null && (
                  <Text fontSize={12} opacity={0.6} marginTop={4}>
                    No staff profile yet — saving creates one (marks trainer as internal).
                  </Text>
                )}
              </div>
              {msg && <Text fontSize={13} opacity={0.7}>{msg}</Text>}
            </YStack>
          )}
        </div>
      </XStack>
    </YStack>
  );
}
