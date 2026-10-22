'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useConvex } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { api } from '@queenix/convex';
import { ALL_ROLES, card, btnPrimary, btnGhost, inputStyle } from './styles';
import { useSessionRoles } from '@/lib/access';
import { authClient } from '@/lib/auth-client';
import { errMsg } from '@/lib/errors';
import { assignableRoles, canDo, roleEditBlock } from '../admin/can';

/* ---------------- Roles & permissions ---------------- */

export function PermissionsTab() {
  const overview = useQuery(api.queries.teamOrg.rolesOverview, {});
  const directory = useQuery(api.queries.org.staffDirectory, {});
  const setRoles = useMutation(api.mutations.teamOrg.setStaffRoles);
  const upsertProfile = useMutation(api.mutations.teamOrg.upsertStaffProfile);
  const [selectedId, setSelectedId] = useState('');
  const [roles, setRolesState] = useState<string[]>([]);
  const [activeRole, setActiveRole] = useState('');
  const [profile, setProfile] = useState({ title: '', department: '', reportsToId: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const convex = useConvex();
  const [findEmail, setFindEmail] = useState('');
  const [found, setFound] = useState<any>(null);
  // Mirrors mutations/teamOrg guards: finance+ edit roles/profiles (ops view
  // read-only), only roles below your own rank, never your own or a peer's.
  const myRoles = useSessionRoles();
  const myEmail = authClient.useSession().data?.user?.email ?? null;
  const canEdit = canDo(myRoles, 'staff.roles');
  const assignable = assignableRoles(myRoles, ALL_ROLES);

  if (overview === undefined) return <Text opacity={0.6}>Loading roles…</Text>;
  const ov = overview as any;
  // A looked-up member joins the list so they can be granted a staff role.
  const staff = found && !(ov.staff as any[]).some((s) => s._id === found._id) ? [...ov.staff, found] : (ov.staff as any[]);
  const selected = staff.find((s) => String(s._id) === selectedId) ?? null;
  const block = selected
    ? roleEditBlock({ email: myEmail, roles: myRoles }, { email: selected.email, roles: selected.roles ?? [] })
    : null;
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

  async function findByEmail() {
    setMsg(null);
    let u;
    try {
      u = await convex.query(api.queries.teamOrg.userByEmail, { email: findEmail });
    } catch (err) {
      return setMsg(errMsg(err, 'Lookup failed.'));
    }
    if (!u) return setMsg(`No account for ${findEmail} — they need to sign up first.`);
    setFound(u);
    setSelectedId(String(u._id));
    setRolesState([...u.roles]);
    setActiveRole(u.activeRole);
    setProfile({ title: '', department: '', reportsToId: '' });
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
      // Web access is gated on BetterAuth roles — copy the saved roles there too.
      const res = await fetch('/api/team/roles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: selected._id }),
      });
      if (!res.ok) throw new Error('Roles saved, but web access did not update — save again.');
      setMsg('Roles saved.');
    } catch (err: any) {
      setMsg(errMsg(err, 'Failed to save roles.'));
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
      setMsg(errMsg(err, 'Failed to save profile.'));
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
          {canEdit && (
          <XStack gap={8} marginTop={8}>
            <input
              aria-label="Add staff by email"
              placeholder="Add by email"
              value={findEmail}
              onChange={(e) => setFindEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && findEmail && findByEmail()}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button style={btnGhost} disabled={!findEmail} onClick={findByEmail}>
              Find
            </button>
          </XStack>
          )}
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
              {msg ?? 'Select a staff member to edit roles and profile.'}
            </Text>
          ) : (
            <YStack gap={12}>
              <Text fontSize={15} fontWeight="700">
                {selected.fullName}
              </Text>
              {!canEdit || block ? (
                <Text fontSize={13} opacity={0.7}>
                  Roles: {(selected.roles ?? []).join(', ')} · active {selected.activeRole}
                  {canEdit ? ` — ${block}` : ' — role changes need finance or above.'}
                </Text>
              ) : (
              <>
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
                        disabled={!assignable.includes(r)}
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
                  {ALL_ROLES.filter((r) => roles.includes(r)).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <button style={{ ...btnPrimary, alignSelf: 'flex-start' }} onClick={saveRoles}>
                Save roles
              </button>
              </>
              )}
              {canEdit && (
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
              )}
              {msg && <Text fontSize={13} opacity={0.7}>{msg}</Text>}
            </YStack>
          )}
        </div>
      </XStack>
    </YStack>
  );
}
