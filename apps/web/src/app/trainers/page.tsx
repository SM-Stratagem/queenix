'use client';

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { api } from '@queenix/convex';
import { AdminShell } from '@/components/admin/AdminShell';
import { RequireAuth } from '@/components/RequireAuth';
import { downloadCsv } from '../../components/finance/CsvExport';

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 16,
};

const btnGhost: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  color: 'var(--text)',
};

const pill = (tone: 'green' | 'gray' | 'blue'): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: 999,
  background:
    tone === 'green' ? '#dcfce7' : tone === 'blue' ? 'var(--brand-light)' : 'var(--bg-muted)',
  color: tone === 'green' ? '#166534' : tone === 'blue' ? 'var(--brand)' : 'var(--text-muted)',
});

function money(cents: number, currency: string) {
  return `${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

/** Document validity from expiry: valid / expiring (≤60d) / expired / lifetime. */
function certValidity(expiresAt: number | null | undefined): { label: string; bg: string; color: string } {
  if (!expiresAt) return { label: 'No expiry', bg: '#0081cc20', color: 'var(--brand)' };
  const ms = expiresAt - Date.now();
  if (ms < 0) return { label: 'Expired', bg: '#dc262620', color: '#dc2626' };
  if (ms < 60 * 24 * 60 * 60 * 1000) return { label: 'Expiring soon', bg: '#f59e0b20', color: '#b45309' };
  return { label: 'Valid', bg: '#10b98120', color: 'var(--success)' };
}

export default function TrainersPage() {
  const [search, setSearch] = useState('');
  const [availability, setAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
  const [employment, setEmployment] = useState<'all' | 'internal' | 'external'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dir = useQuery(api.queries.teamOrg.trainersDirectory, {
    search: search || undefined,
    availability,
    employment,
  });
  const detail = useQuery(
    api.queries.teamOrg.trainerDetail,
    selectedId ? { trainerId: selectedId as any } : 'skip'
  );

  return (
    <RequireAuth>
      <AdminShell>
        <YStack gap={20} padding={24}>
          <YStack gap={4}>
            <Text fontSize={28} fontWeight="800">
              Trainers
            </Text>
            <Text fontSize={13} opacity={0.6}>
              Internal &amp; external coaches · clients · classes · inflows
            </Text>
          </YStack>

          <XStack gap={8} flexWrap="wrap" alignItems="center">
            <Input
              placeholder="Search trainers…"
              value={search}
              onChangeText={setSearch}
              width={200}
            />
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as any)}
              style={{ ...btnGhost }}
            >
              <option value="all">Any availability</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
            <select
              value={employment}
              onChange={(e) => setEmployment(e.target.value as any)}
              style={{ ...btnGhost }}
            >
              <option value="all">Internal + external</option>
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
            {(dir ?? []).length > 0 && (
              <button
                onClick={() =>
                  downloadCsv(
                    'trainers',
                    ((dir ?? []) as any[]).map((t: any) => ({
                      name: t.user.fullName,
                      email: t.user.email,
                      employment: t.employment,
                      available: t.trainerProfile ? (t.trainerProfile.isAvailable ? 'yes' : 'no') : '',
                      clients: t.clientCount ?? 0,
                      ptSessions: t.sessionCount ?? 0,
                      upcomingClasses: t.upcomingClassCount ?? 0,
                    }))
                  )
                }
                style={{ ...btnGhost, fontWeight: 700, cursor: 'pointer' }}
              >
                Export CSV
              </button>
            )}
          </XStack>

          {dir === undefined ? (
            <Text opacity={0.6}>Loading trainers…</Text>
          ) : dir.length === 0 ? (
            <div style={card}>
              <Text fontSize={14} fontWeight="700">
                No trainers found
              </Text>
              <Text fontSize={13} opacity={0.6}>
                No users hold the trainer role with these filters. Grant the trainer
                role under Team → Roles &amp; permissions.
              </Text>
            </div>
          ) : (
            <XStack gap={16} flexWrap="wrap" alignItems="flex-start">
              <div style={{ flex: 1, minWidth: 280, display: 'grid', gap: 10 }}>
                {(dir as any[]).map((t) => (
                  <div
                    key={String(t.user._id)}
                    onClick={() => setSelectedId(String(t.user._id))}
                    style={{
                      ...card,
                      cursor: 'pointer',
                      borderColor:
                        selectedId === String(t.user._id) ? 'var(--brand)' : 'var(--border)',
                    }}
                  >
                    <XStack gap={8} alignItems="center" justifyContent="space-between">
                      <Text fontSize={15} fontWeight="700">
                        {t.user.fullName}
                      </Text>
                      <XStack gap={6}>
                        <span style={pill(t.employment === 'internal' ? 'blue' : 'gray')}>
                          {t.employment}
                        </span>
                        {t.trainerProfile && (
                          <span
                            style={pill(t.trainerProfile.isAvailable ? 'green' : 'gray')}
                          >
                            {t.trainerProfile.isAvailable ? 'available' : 'unavailable'}
                          </span>
                        )}
                      </XStack>
                    </XStack>
                    <Text fontSize={12} opacity={0.6}>
                      {[t.title, t.trainerProfile?.specialties?.slice(0, 3).join(', ')]
                        .filter(Boolean)
                        .join(' · ') || t.user.email}
                    </Text>
                    <XStack gap={12} marginTop={6}>
                      <Text fontSize={12} opacity={0.7}>
                        {t.clientCount} clients
                      </Text>
                      <Text fontSize={12} opacity={0.7}>
                        {t.sessionCount} PT sessions
                      </Text>
                      <Text fontSize={12} opacity={0.7}>
                        {t.upcomingClassCount} upcoming classes
                      </Text>
                    </XStack>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, minWidth: 300 }}>
                {!selectedId ? (
                  <div style={card}>
                    <Text fontSize={13} opacity={0.6}>
                      Select a trainer to see clients, classes and inflows.
                    </Text>
                  </div>
                ) : detail === undefined ? (
                  <Text opacity={0.6}>Loading detail…</Text>
                ) : !detail ? (
                  <div style={card}>
                    <Text fontSize={13} opacity={0.6}>
                      Trainer not found.
                    </Text>
                  </div>
                ) : (
                  <TrainerDetail d={detail as any} />
                )}
              </div>
            </XStack>
          )}
        </YStack>
      </AdminShell>
    </RequireAuth>
  );
}

function TrainerDetail({ d }: { d: any }) {
  const p = d.trainerProfile;
  return (
    <YStack gap={12}>
      <div style={card}>
        <Text fontSize={17} fontWeight="800">
          {d.user.fullName}
        </Text>
        <Text fontSize={13} opacity={0.6}>
          {d.user.email}
          {d.staffProfile ? ` · ${d.staffProfile.title} (${d.staffProfile.department})` : ' · external coach'}
        </Text>
        {p?.bio && (
          <Text fontSize={13} marginTop={6}>
            {p.bio}
          </Text>
        )}
        <XStack gap={12} marginTop={8} flexWrap="wrap">
          <Text fontSize={13}>
            Rate:{' '}
            <strong>
              {p ? money(p.hourlyRateCents, p.currency) : '—'}/hr
            </strong>
          </Text>
          {p && (
            <Text fontSize={13}>
              Rating: <strong>{p.rating.toFixed(1)}</strong> ({p.reviewCount})
            </Text>
          )}
        </XStack>
        {d.branches?.length > 0 && (
          <Text fontSize={13} marginTop={4} opacity={0.7}>
            Branches: {d.branches.map((b: any) => b.branch?.name ?? '?').join(', ')}
          </Text>
        )}
      </div>

      <div style={card}>
        <Text fontSize={15} fontWeight="700">
          Certifications &amp; documents ({(p?.certifications ?? []).length})
        </Text>
        {(p?.certifications ?? []).length === 0 ? (
          <Text fontSize={13} opacity={0.6} marginTop={4}>
            No documents uploaded yet.
          </Text>
        ) : (
          <YStack gap={6} marginTop={8}>
            {(p.certifications as any[]).map((c: any, i: number) => {
              const v = certValidity(c.expiresAt);
              return (
                <XStack key={`${c.name}-${i}`} gap={8} justifyContent="space-between" alignItems="center">
                  <YStack gap={1}>
                    <Text fontSize={13} fontWeight="600">
                      {c.name}
                    </Text>
                    <Text fontSize={12} opacity={0.6}>
                      {c.issuer} · issued{' '}
                      {new Date(c.issuedAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {c.expiresAt
                        ? ` · expires ${new Date(c.expiresAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : ' · no expiry'}
                    </Text>
                  </YStack>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: v.bg,
                      color: v.color,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v.label}
                  </span>
                </XStack>
              );
            })}
          </YStack>
        )}
      </div>

      <div style={card}>
        <Text fontSize={15} fontWeight="700">
          Inflows
        </Text>
        <XStack gap={16} marginTop={6} flexWrap="wrap">
          <Text fontSize={13}>
            Total: <strong>{money(d.earnings.totalCents, d.earnings.currency)}</strong>
          </Text>
          <Text fontSize={13}>
            Pending: <strong>{money(d.earnings.pendingCents, d.earnings.currency)}</strong>
          </Text>
          <Text fontSize={13}>
            Paid: <strong>{money(d.earnings.paidCents, d.earnings.currency)}</strong>
          </Text>
        </XStack>
        <Text fontSize={12} opacity={0.6} marginTop={4}>
          Across {d.earnings.recordCount} earning records.
        </Text>
      </div>

      <div style={card}>
        <Text fontSize={15} fontWeight="700">
          Clients ({d.clients.length})
        </Text>
        {d.clients.length === 0 ? (
          <Text fontSize={13} opacity={0.6} marginTop={4}>
            No PT clients yet.
          </Text>
        ) : (
          <YStack gap={6} marginTop={8}>
            {d.clients.slice(0, 10).map((c: any) => (
              <XStack key={String(c.member?._id)} gap={8} justifyContent="space-between">
                <Text fontSize={13} fontWeight="600">
                  {c.member?.fullName ?? 'Unknown member'}
                </Text>
                <Text fontSize={12} opacity={0.6}>
                  {c.sessionCount} sessions
                  {c.nextSessionAt
                    ? ` · next ${new Date(c.nextSessionAt).toLocaleDateString()}`
                    : ''}
                </Text>
              </XStack>
            ))}
          </YStack>
        )}
      </div>

      <div style={card}>
        <Text fontSize={15} fontWeight="700">
          Upcoming classes ({d.upcomingClasses.length})
        </Text>
        {d.upcomingClasses.length === 0 ? (
          <Text fontSize={13} opacity={0.6} marginTop={4}>
            Not scheduled to teach any upcoming classes.
          </Text>
        ) : (
          <YStack gap={6} marginTop={8}>
            {d.upcomingClasses.map((c: any) => (
              <Text key={String(c.instance._id)} fontSize={13}>
                {c.classType?.name ?? 'Class'} ·{' '}
                {new Date(c.instance.startsAt).toLocaleString()} · {c.instance.bookedCount}/
                {c.instance.capacity} booked
              </Text>
            ))}
          </YStack>
        )}
      </div>
    </YStack>
  );
}
