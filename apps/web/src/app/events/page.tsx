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

function toLocalInput(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventsPage() {
  const [branchFilter, setBranchFilter] = useState('');
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    branchId: '',
    startsAt: '',
    endsAt: '',
    capacity: '',
  });
  const [msg, setMsg] = useState<string | null>(null);

  const events = useQuery(api.queries.branches.eventsList, {
    branchId: (branchFilter || undefined) as any,
    upcomingOnly,
    limit: 100,
  });
  const branches = useQuery(api.queries.branches.branchesList, { includeInactive: false });
  const createEvent = useMutation(api.mutations.branches.createEvent);
  const updateEvent = useMutation(api.mutations.branches.updateEvent);
  const cancelEvent = useMutation(api.mutations.branches.cancelEvent);

  function openCreate() {
    setEditing(null);
    const start = new Date();
    start.setHours(start.getHours() + 24, 0, 0, 0);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    setForm({
      title: '',
      description: '',
      branchId: branchFilter,
      startsAt: toLocalInput(start.getTime()),
      endsAt: toLocalInput(end.getTime()),
      capacity: '',
    });
    setShowForm(true);
    setMsg(null);
  }

  function openEdit(e: any) {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description ?? '',
      branchId: e.branchId ? String(e.branchId) : '',
      startsAt: toLocalInput(e.startsAt),
      endsAt: toLocalInput(e.endsAt),
      capacity: e.capacity ? String(e.capacity) : '',
    });
    setShowForm(true);
    setMsg(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        branchId: (form.branchId || undefined) as any,
        startsAt: new Date(form.startsAt).getTime(),
        endsAt: new Date(form.endsAt).getTime(),
        capacity: form.capacity ? Number(form.capacity) : undefined,
      };
      if (editing) {
        await updateEvent({ eventId: editing._id, ...payload });
        setMsg('Event updated.');
      } else {
        await createEvent(payload);
        setMsg('Event created.');
      }
      setShowForm(false);
    } catch (err: any) {
      setMsg(err?.message ?? 'Failed to save event.');
    }
  }

  return (
    <RequireAuth>
      <AdminShell>
        <YStack gap={20} padding={24}>
          <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
            <YStack gap={4}>
              <Text fontSize={28} fontWeight="800">
                Events
              </Text>
              <Text fontSize={13} opacity={0.6}>
                Gym-wide and per-branch events · workshops · challenges
              </Text>
            </YStack>
            <button style={btnPrimary} onClick={openCreate}>
              + New event
            </button>
          </XStack>

          <XStack gap={8} flexWrap="wrap" alignItems="center">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              style={{ ...btnGhost, background: 'var(--bg-elevated)' }}
            >
              <option value="">All branches + gym-wide</option>
              {((branches ?? []) as any[]).map(({ branch }) => (
                <option key={String(branch._id)} value={String(branch._id)}>
                  {branch.name}
                </option>
              ))}
            </select>
            <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={upcomingOnly}
                onChange={(e) => setUpcomingOnly(e.target.checked)}
              />
              Upcoming only
            </label>
          </XStack>

          {showForm && (
            <div style={card}>
              <Text fontSize={15} fontWeight="700">
                {editing ? 'Edit event' : 'New event'}
              </Text>
              <form onSubmit={submit}>
                <YStack gap={8} marginTop={8}>
                  <XStack gap={8} flexWrap="wrap">
                    <input
                      required
                      placeholder="Title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      style={{ ...inputStyle, maxWidth: 280 }}
                    />
                    <select
                      value={form.branchId}
                      onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                      style={{ ...inputStyle, maxWidth: 200 }}
                    >
                      <option value="">Gym-wide (all branches)</option>
                      {((branches ?? []) as any[]).map(({ branch }) => (
                        <option key={String(branch._id)} value={String(branch._id)}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Capacity (optional)"
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      style={{ ...inputStyle, maxWidth: 160 }}
                    />
                  </XStack>
                  <XStack gap={8} flexWrap="wrap">
                    <label style={{ fontSize: 13 }}>
                      Starts{' '}
                      <input
                        required
                        type="datetime-local"
                        value={form.startsAt}
                        onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                        style={{ ...inputStyle, maxWidth: 220 }}
                      />
                    </label>
                    <label style={{ fontSize: 13 }}>
                      Ends{' '}
                      <input
                        required
                        type="datetime-local"
                        value={form.endsAt}
                        onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                        style={{ ...inputStyle, maxWidth: 220 }}
                      />
                    </label>
                  </XStack>
                  <textarea
                    placeholder="Description (optional)"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    style={{ ...inputStyle, minHeight: 60 }}
                  />
                  <XStack gap={8}>
                    <button type="submit" style={btnPrimary}>
                      Save
                    </button>
                    <button type="button" style={btnGhost} onClick={() => setShowForm(false)}>
                      Cancel
                    </button>
                  </XStack>
                </YStack>
              </form>
            </div>
          )}

          {msg && <Text fontSize={13} opacity={0.7}>{msg}</Text>}

          {events === undefined ? (
            <Text opacity={0.6}>Loading events…</Text>
          ) : events.length === 0 ? (
            <div style={card}>
              <Text fontSize={14} fontWeight="700">
                No events found
              </Text>
              <Text fontSize={13} opacity={0.6}>
                {upcomingOnly || branchFilter
                  ? 'Nothing matches these filters — clear them or create a new event.'
                  : 'Create the first event to get started.'}
              </Text>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {(events as any[]).map(({ event, branch }) => (
                <div key={String(event._id)} style={card}>
                  <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
                    <YStack gap={2}>
                      <Text fontSize={15} fontWeight="700">
                        {event.title}{' '}
                        <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.6 }}>
                          {branch ? `· ${branch.name}` : '· gym-wide'} · {event.status}
                        </span>
                      </Text>
                      <Text fontSize={13} opacity={0.7}>
                        {new Date(event.startsAt).toLocaleString()} →{' '}
                        {new Date(event.endsAt).toLocaleString()}
                        {event.capacity ? ` · cap ${event.capacity}` : ''}
                      </Text>
                      {event.description && (
                        <Text fontSize={13} opacity={0.7}>
                          {event.description}
                        </Text>
                      )}
                    </YStack>
                    {event.status === 'scheduled' && (
                      <XStack gap={8}>
                        <button style={btnGhost} onClick={() => openEdit(event)}>
                          Edit
                        </button>
                        <button
                          style={btnGhost}
                          onClick={() => cancelEvent({ eventId: event._id })}
                        >
                          Cancel
                        </button>
                      </XStack>
                    )}
                  </XStack>
                </div>
              ))}
            </div>
          )}
        </YStack>
      </AdminShell>
    </RequireAuth>
  );
}
