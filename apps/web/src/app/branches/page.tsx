'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { api } from '@queenix/convex';
import { AdminShell } from '@/components/admin/AdminShell';
import { RequireAuth } from '@/components/RequireAuth';

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

export default function BranchesPage() {
  const list = useQuery(api.queries.branches.branchesList, { includeInactive: true });
  const createBranch = useMutation(api.mutations.branches.createBranch);
  const updateBranch = useMutation(api.mutations.branches.updateBranch);
  const setActive = useMutation(api.mutations.branches.setBranchActive);
  const assignStaff = useMutation(api.mutations.teamOrg.assignBranchStaff);
  const unassignStaff = useMutation(api.mutations.teamOrg.unassignBranchStaff);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', city: '', address: '', phone: '' });
  const [assign, setAssign] = useState({ userId: '', role: '', isPrimary: false });
  const [msg, setMsg] = useState<string | null>(null);

  const detail = useQuery(
    api.queries.branches.branchDetail,
    selectedId ? { branchId: selectedId as any } : 'skip'
  );
  const staffDir = useQuery(api.queries.org.staffDirectory, {});

  function openCreate() {
    setEditingId(null);
    setForm({ name: '', city: '', address: '', phone: '' });
    setShowForm(true);
    setMsg(null);
  }

  function openEdit(b: any) {
    setEditingId(String(b._id));
    setForm({
      name: b.name,
      city: b.city,
      address: b.address ?? '',
      phone: b.phone ?? '',
    });
    setShowForm(true);
    setMsg(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {
        name: form.name,
        city: form.city,
        address: form.address || undefined,
        phone: form.phone || undefined,
      };
      if (editingId) {
        await updateBranch({ branchId: editingId as any, ...payload });
        setMsg('Branch updated.');
      } else {
        const created = (await createBranch(payload)) as any;
        setMsg('Branch created.');
        if (created?._id) setSelectedId(String(created._id));
      }
      setShowForm(false);
    } catch (err: any) {
      setMsg(err?.message ?? 'Failed to save branch.');
    }
  }

  async function submitAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !assign.userId) return;
    setMsg(null);
    try {
      await assignStaff({
        branchId: selectedId as any,
        userId: assign.userId as any,
        role: assign.role || 'staff',
        isPrimary: assign.isPrimary,
      });
      setAssign({ userId: '', role: '', isPrimary: false });
      setMsg('Staff assigned.');
    } catch (err: any) {
      setMsg(err?.message ?? 'Failed to assign staff.');
    }
  }

  return (
    <RequireAuth>
      <AdminShell>
        <YStack gap={20} padding={24}>
          <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
            <YStack gap={4}>
              <Text fontSize={28} fontWeight="800">
                Branches
              </Text>
              <Text fontSize={13} opacity={0.6}>
                Multi-branch management · staff assignments · local events
              </Text>
            </YStack>
            <button style={btnPrimary} onClick={openCreate}>
              + New branch
            </button>
          </XStack>

          {showForm && (
            <div style={card}>
              <Text fontSize={15} fontWeight="700">
                {editingId ? 'Edit branch' : 'New branch'}
              </Text>
              <form onSubmit={submit}>
                <XStack gap={8} marginTop={8} flexWrap="wrap">
                  <input
                    required
                    placeholder="Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{ ...inputStyle, maxWidth: 200 }}
                  />
                  <input
                    required
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    style={{ ...inputStyle, maxWidth: 160 }}
                  />
                  <input
                    placeholder="Address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    style={{ ...inputStyle, maxWidth: 240 }}
                  />
                  <input
                    placeholder="Phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={{ ...inputStyle, maxWidth: 160 }}
                  />
                  <button type="submit" style={btnPrimary}>
                    Save
                  </button>
                  <button type="button" style={btnGhost} onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                </XStack>
              </form>
            </div>
          )}

          {msg && <Text fontSize={13} opacity={0.7}>{msg}</Text>}

          {list === undefined ? (
            <Text opacity={0.6}>Loading branches…</Text>
          ) : list.length === 0 ? (
            <div style={card}>
              <Text fontSize={14} fontWeight="700">
                No branches yet
              </Text>
              <Text fontSize={13} opacity={0.6}>
                Create the first branch to start managing locations, staffing and
                events per branch.
              </Text>
            </div>
          ) : (
            <XStack gap={16} flexWrap="wrap" alignItems="flex-start">
              <div style={{ flex: 1, minWidth: 260, display: 'grid', gap: 10 }}>
                {(list as any[]).map(({ branch, staffCount, upcomingEventCount }) => (
                  <div
                    key={String(branch._id)}
                    onClick={() => setSelectedId(String(branch._id))}
                    style={{
                      ...card,
                      cursor: 'pointer',
                      opacity: branch.isActive ? 1 : 0.6,
                      borderColor:
                        selectedId === String(branch._id) ? 'var(--brand)' : 'var(--border)',
                    }}
                  >
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={15} fontWeight="700">
                        {branch.name}
                      </Text>
                      {!branch.isActive && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: 'var(--bg-muted)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          inactive
                        </span>
                      )}
                    </XStack>
                    <Text fontSize={12} opacity={0.6}>
                      {branch.city}
                      {branch.address ? ` · ${branch.address}` : ''}
                    </Text>
                    <Text fontSize={12} opacity={0.7} marginTop={4}>
                      {staffCount} staff · {upcomingEventCount} upcoming events
                    </Text>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, minWidth: 300 }}>
                {!selectedId ? (
                  <div style={card}>
                    <Text fontSize={13} opacity={0.6}>
                      Select a branch to manage staffing and settings.
                    </Text>
                  </div>
                ) : detail === undefined ? (
                  <Text opacity={0.6}>Loading branch…</Text>
                ) : !detail ? (
                  <div style={card}>
                    <Text fontSize={13} opacity={0.6}>
                      Branch not found.
                    </Text>
                  </div>
                ) : (
                  <YStack gap={12}>
                    <div style={card}>
                      <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
                        <Text fontSize={17} fontWeight="800">
                          {(detail as any).branch.name}
                        </Text>
                        <XStack gap={8}>
                          <button style={btnGhost} onClick={() => openEdit((detail as any).branch)}>
                            Edit
                          </button>
                          <button
                            style={btnGhost}
                            onClick={() =>
                              setActive({
                                branchId: selectedId as any,
                                isActive: !(detail as any).branch.isActive,
                              })
                            }
                          >
                            {(detail as any).branch.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </XStack>
                      </XStack>
                      <Text fontSize={13} opacity={0.6}>
                        {(detail as any).branch.city}
                        {(detail as any).branch.address
                          ? ` · ${(detail as any).branch.address}`
                          : ''}
                        {(detail as any).branch.phone
                          ? ` · ${(detail as any).branch.phone}`
                          : ''}
                      </Text>
                    </div>

                    <div style={card}>
                      <Text fontSize={15} fontWeight="700">
                        Staff ({(detail as any).staff.length})
                      </Text>
                      {(detail as any).staff.length === 0 ? (
                        <Text fontSize={13} opacity={0.6} marginTop={4}>
                          Nobody assigned yet.
                        </Text>
                      ) : (
                        <YStack gap={6} marginTop={8}>
                          {(detail as any).staff.map((s: any) => (
                            <XStack
                              key={String(s.link._id)}
                              gap={8}
                              alignItems="center"
                              justifyContent="space-between"
                            >
                              <Text fontSize={13}>
                                <strong>{s.user?.fullName ?? 'Unknown'}</strong>{' '}
                                <span style={{ opacity: 0.6 }}>
                                  · {s.link.role}
                                  {s.link.isPrimary ? ' (primary)' : ''}
                                </span>
                              </Text>
                              <button
                                style={btnGhost}
                                onClick={() =>
                                  unassignStaff({
                                    branchId: selectedId as any,
                                    userId: s.link.userId,
                                  })
                                }
                              >
                                Remove
                              </button>
                            </XStack>
                          ))}
                        </YStack>
                      )}
                      <form onSubmit={submitAssign}>
                        <XStack gap={8} marginTop={12} flexWrap="wrap" alignItems="center">
                          <select
                            required
                            value={assign.userId}
                            onChange={(e) => setAssign({ ...assign, userId: e.target.value })}
                            style={{ ...inputStyle, maxWidth: 200 }}
                          >
                            <option value="">Select staff…</option>
                            {((staffDir ?? []) as any[]).map((d) => (
                              <option key={String(d.user._id)} value={String(d.user._id)}>
                                {d.user.fullName} ({d.user.activeRole})
                              </option>
                            ))}
                          </select>
                          <input
                            placeholder="Role at branch"
                            value={assign.role}
                            onChange={(e) => setAssign({ ...assign, role: e.target.value })}
                            style={{ ...inputStyle, maxWidth: 160 }}
                          />
                          <label style={{ fontSize: 13, display: 'flex', gap: 4 }}>
                            <input
                              type="checkbox"
                              checked={assign.isPrimary}
                              onChange={(e) =>
                                setAssign({ ...assign, isPrimary: e.target.checked })
                              }
                            />
                            Primary
                          </label>
                          <button type="submit" style={btnPrimary}>
                            Assign
                          </button>
                        </XStack>
                      </form>
                    </div>

                    <div style={card}>
                      <Text fontSize={15} fontWeight="700">
                        Events at this branch
                      </Text>
                      {(detail as any).events.length === 0 ? (
                        <Text fontSize={13} opacity={0.6} marginTop={4}>
                          No events yet — create one from the Events page.
                        </Text>
                      ) : (
                        <YStack gap={6} marginTop={8}>
                          {(detail as any).events.slice(0, 8).map((e: any) => (
                            <Text key={String(e._id)} fontSize={13}>
                              {e.title} · {new Date(e.startsAt).toLocaleString()} · {e.status}
                            </Text>
                          ))}
                        </YStack>
                      )}
                    </div>
                  </YStack>
                )}
              </div>
            </XStack>
          )}
        </YStack>
      </AdminShell>
    </RequireAuth>
  );
}
