'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { api } from '@queenix/convex';
import { canOpen, useSessionRoles } from '@/lib/access';

function fmtTs(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-AE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function EarningsTotal({ rows }: { rows: any[] }) {
  const paid = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + (r.amountCents ?? 0), 0);
  const pending = rows.filter((r) => r.status === 'pending').reduce((s, r) => s + (r.amountCents ?? 0), 0);
  const currency = rows[0]?.currency ?? 'AED';
  return (
    <YStack gap={2}>
      <Text fontSize={22} fontWeight="800">
        {fmtMoney(paid + pending, currency)}
      </Text>
      <Text fontSize={12} opacity={0.6}>
        {fmtMoney(paid, currency)} paid · {fmtMoney(pending, currency)} pending · {rows.length} sessions
      </Text>
    </YStack>
  );
}

function fmtMoney(cents: number | undefined, currency = 'AED'): string {
  const v = ((cents ?? 0) / 100).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${v}`;
}

/**
 * Trainer home on web: my clients, today's sessions, week schedule,
 * earnings, my certifications (add), plus outreach shortcuts.
 */
export default function TrainerPage() {
  const roles = useSessionRoles();
  const clients = useQuery(api.queries.users.getMyClients, {});
  const today = useQuery(api.queries.users.getTodaySessions, {});
  const week = useQuery(api.queries.users.getWeekSchedule, {});
  const earnings = useQuery(api.queries.users.getMyEarnings, {});
  const profile = useQuery(api.queries.users.getMyTrainerProfile, {});
  const addCert = useMutation(api.mutations.users.addTrainerCertification);

  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onAddCert(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !issuer.trim()) {
      setNotice('Name and issuer are required.');
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await addCert({ name: name.trim(), issuer: issuer.trim(), issuedAt: Date.now() });
      setName('');
      setIssuer('');
      setNotice('Certification added.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not add certification.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 13,
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <YStack gap={20} padding={24}>
      <YStack gap={4}>
        <Text fontSize={28} fontWeight="800">
          Trainer
        </Text>
        <Text fontSize={13} opacity={0.6}>
          My clients · sessions · earnings · certifications · outreach
        </Text>
        <XStack gap={12}>
          <Link href="/notifications" style={{ fontSize: 13, color: '#0081cc', fontWeight: 600 }}>
            Notifications →
          </Link>
          <Link href="/sales-push" style={{ fontSize: 13, color: '#0081cc', fontWeight: 600 }}>
            Sales push →
          </Link>
          {canOpen(roles, '/documents') && (
            <Link href="/documents" style={{ fontSize: 13, color: '#0081cc', fontWeight: 600 }}>
              Documents →
            </Link>
          )}
        </XStack>
      </YStack>

      <YStack gap={8}>
        <Text fontSize={18} fontWeight="700">
          My clients ({clients === undefined ? '…' : clients.length})
        </Text>
        {clients === undefined ? (
          <Text fontSize={13} opacity={0.6}>Loading clients…</Text>
        ) : clients.length === 0 ? (
          <Text fontSize={13} opacity={0.6}>
            No clients yet — clients appear here once PT sessions are scheduled with you.
          </Text>
        ) : (
          clients.map((c: any, i: number) => (
            <XStack
              key={c.member?._id ?? i}
              justifyContent="space-between"
              padding={12}
              style={{ border: '1px solid var(--border)', borderRadius: 10 }}
            >
              <YStack gap={2}>
                <Text fontSize={14} fontWeight="700">
                  {c.member?.fullName ?? 'Member'}
                </Text>
                <Text fontSize={12} opacity={0.6}>
                  {c.member?.email ?? ''} · {c.sessionCount} sessions ({c.completedCount} completed)
                </Text>
              </YStack>
              <Text fontSize={12} opacity={0.6}>
                Next: {fmtTs(c.nextSessionAt)}
              </Text>
            </XStack>
          ))
        )}
      </YStack>

      <YStack gap={8}>
        <Text fontSize={18} fontWeight="700">
          Today&apos;s sessions
        </Text>
        {today === undefined ? (
          <Text fontSize={13} opacity={0.6}>Loading today…</Text>
        ) : Array.isArray(today) && today.length > 0 ? (
          (today as any[]).map((s: any, i: number) => (
            <XStack
              key={String(s._id ?? i)}
              justifyContent="space-between"
              padding={12}
              style={{ border: '1px solid var(--border)', borderRadius: 10 }}
            >
              <YStack gap={2}>
                <Text fontSize={14} fontWeight="700">
                  {s.member?.fullName ?? 'Member'}
                </Text>
                <Text fontSize={12} opacity={0.6}>
                  {s.durationMinutes}-min PT · {s.status}
                </Text>
              </YStack>
              <Text fontSize={12} opacity={0.6}>
                {fmtTs(s.scheduledAt)}
              </Text>
            </XStack>
          ))
        ) : (
          <Text fontSize={13} opacity={0.6}>Nothing scheduled today.</Text>
        )}
      </YStack>

      <YStack gap={8}>
        <Text fontSize={18} fontWeight="700">
          Earnings
        </Text>
        {earnings === undefined ? (
          <Text fontSize={13} opacity={0.6}>Loading earnings…</Text>
        ) : (
          <EarningsTotal rows={(earnings as any[]) ?? []} />
        )}
      </YStack>

      <YStack gap={8}>
        <Text fontSize={18} fontWeight="700">
          My certifications
        </Text>
        {profile === undefined ? (
          <Text fontSize={13} opacity={0.6}>Loading profile…</Text>
        ) : ((profile as any)?.certifications?.length ?? 0) === 0 ? (
          <Text fontSize={13} opacity={0.6}>No certifications on file yet.</Text>
        ) : (
          (profile as any).certifications.map((cert: any, i: number) => (
            <Text key={i} fontSize={13}>
              {cert.name} — {cert.issuer}
              {cert.expiresAt ? ` (expires ${new Date(cert.expiresAt).toLocaleDateString('en-AE')})` : ''}
            </Text>
          ))
        )}
        <form onSubmit={onAddCert} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
          <input placeholder="Certification name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <input placeholder="Issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} style={inputStyle} />
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--brand)',
              color: 'white',
              fontWeight: 700,
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Adding…' : 'Add certification'}
          </button>
          {notice ? <Text fontSize={12} opacity={0.7}>{notice}</Text> : null}
        </form>
      </YStack>

      <YStack gap={8}>
        <Text fontSize={18} fontWeight="700">
          Week schedule
        </Text>
        {week === undefined ? (
          <Text fontSize={13} opacity={0.6}>Loading week…</Text>
        ) : (
          <Text fontSize={13} opacity={0.6}>
            {(week as any)?.items?.length ?? 0} session(s) this week.
          </Text>
        )}
      </YStack>
    </YStack>
  );
}
