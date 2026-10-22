'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { api } from '@queenix/convex';
import { errMsg } from '@/lib/errors';
import { card, btnPrimary, btnGhost, inputStyle } from '@/components/admin/styles';
import { BranchDetail } from '@/components/branches/BranchDetail';

export default function BranchesPage() {
  const list = useQuery(api.queries.branches.branchesList, { includeInactive: true });
  const createBranch = useMutation(api.mutations.branches.createBranch);
  const updateBranch = useMutation(api.mutations.branches.updateBranch);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', city: '', address: '', phone: '' });
  const [msg, setMsg] = useState<string | null>(null);

  const detail = useQuery(
    api.queries.branches.branchDetail,
    selectedId ? { branchId: selectedId as any } : 'skip'
  );

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
    } catch (err) {
      setMsg(errMsg(err, 'Failed to save branch.'));
    }
  }


  return (
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
              <BranchDetail selectedId={selectedId} detail={detail} onEdit={openEdit} notify={setMsg} />
            )}
          </div>
        </XStack>
      )}
    </YStack>
  );
}
