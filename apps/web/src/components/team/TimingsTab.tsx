'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { api } from '@queenix/convex';
import { downloadCsv } from '../finance/CsvExport';
import { card, btnPrimary, btnGhost, inputStyle, fmtDay } from './styles';
import { errMsg } from '@/lib/errors';

/* ---------------- Timings & time off ---------------- */

export function TimingsTab() {
  const timings = useQuery(api.queries.teamOrg.staffTimings, {});
  const timeOff = useQuery(api.queries.teamOrg.timeOffList, { status: 'all', limit: 100 });
  const recordTimeOff = useMutation(api.mutations.teamOrg.recordTimeOff);
  const decideTimeOff = useMutation(api.mutations.teamOrg.decideTimeOff);
  const [form, setForm] = useState({ userId: '', date: '', kind: 'sick', note: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [decideMsg, setDecideMsg] = useState<string | null>(null);
  async function decide(timeOffId: any, decision: 'approved' | 'denied') {
    setDecideMsg(null);
    try {
      await decideTimeOff({ timeOffId, decision });
    } catch (err) {
      setDecideMsg(errMsg(err, 'Failed to save decision.'));
    }
  }

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
      setMsg(errMsg(err, 'Failed to record.'));
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
                  onClick={() => decide(t.record._id, 'approved')}
                >
                  Approve
                </button>
                <button
                  style={btnGhost}
                  onClick={() => decide(t.record._id, 'denied')}
                >
                  Deny
                </button>
              </XStack>
            ))}
          </YStack>
          {decideMsg && (
            <Text fontSize={13} marginTop={8} style={{ color: 'var(--danger)' }}>
              {decideMsg}
            </Text>
          )}
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
