'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import Link from 'next/link';
import { api } from '@queenix/convex';
import { canOpen, useSessionRoles } from '@/lib/access';
import { errMsg } from '@/lib/errors';

type Venue = 'coffee' | 'salon';
type Provider = 'cash' | 'tap' | 'stripe';

function VenueCard({ venue }: { venue: Venue }) {
  const settings = useQuery(api.queries.commerce.getVenuePaymentSettings, { venue });
  const save = useMutation(api.mutations.commerce.saveVenuePaymentSettings);
  const [provider, setProvider] = useState<Provider>('cash');
  const [currency, setCurrency] = useState('AED');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const current = settings as unknown as
    | { provider?: Provider; currency?: string; enabled?: boolean }
    | undefined;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await save({ venue, provider, currency, enabled });
      setNotice('Saved.');
    } catch (err) {
      setNotice(errMsg(err, 'Save failed.'));
    } finally {
      setSaving(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 13,
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    outline: 'none',
  };

  return (
    <YStack
      gap={10}
      padding={16}
      style={{ border: '1px solid var(--border)', borderRadius: 12, maxWidth: 460 }}
    >
      <Text fontSize={16} fontWeight="700" style={{ textTransform: 'capitalize' }}>
        {venue}
      </Text>
      <Text fontSize={12} opacity={0.6}>
        Current: {current === undefined ? 'loading…' : `${current.provider} · ${current.currency} · ${current.enabled ? 'enabled' : 'disabled'}`}
      </Text>
      <form onSubmit={onSave} style={{ display: 'grid', gap: 8 }}>
        <XStack gap={8}>
          <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)} style={selectStyle} aria-label="Provider">
            <option value="cash">cash</option>
            <option value="tap">tap</option>
            <option value="stripe">stripe</option>
          </select>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={selectStyle} aria-label="Currency">
            <option value="AED">AED</option>
            <option value="USD">USD</option>
            <option value="SAR">SAR</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enabled
          </label>
        </XStack>
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
          {saving ? 'Saving…' : 'Save gateway'}
        </button>
        {notice ? <Text fontSize={12} opacity={0.7}>{notice}</Text> : null}
      </form>
    </YStack>
  );
}

/**
 * Settings: venue payment gateways (coffee/salon provider + currency),
 * branch overview, and where each domain is configured.
 */
export default function SettingsPage() {
  const branches = useQuery(api.queries.branches.branchesList, {});
  const roles = useSessionRoles();
  // Venue staff edit only their own venue; managers see both.
  const venues = (['coffee', 'salon'] as const).filter((v) => canOpen(roles, `/${v}`));
  const places = [
    { href: '/team', label: 'Team & roles' },
    { href: '/approvals', label: 'Approvals' },
    { href: '/audit', label: 'Audit log' },
    { href: '/branches', label: 'Branches' },
  ].filter((p) => canOpen(roles, p.href));

  return (
    <YStack gap={20} padding={24}>
      <YStack gap={4}>
        <Text fontSize={28} fontWeight="800">
          Settings
        </Text>
        <Text fontSize={13} opacity={0.6}>
          Venue gateways · branches · access. Secrets stay in env vars — only
          provider + currency live in Convex.
        </Text>
      </YStack>

      <YStack gap={8}>
        <Text fontSize={18} fontWeight="700">
          Venue payment gateways
        </Text>
        <XStack gap={16} flexWrap="wrap">
          {venues.map((v) => (
            <VenueCard key={v} venue={v} />
          ))}
        </XStack>
      </YStack>

      <YStack gap={8}>
        <Text fontSize={18} fontWeight="700">
          Branches ({branches === undefined ? '…' : branches.length})
        </Text>
        {branches === undefined ? (
          <Text fontSize={13} opacity={0.6}>Loading branches…</Text>
        ) : branches.length === 0 ? (
          <Text fontSize={13} opacity={0.6}>
            No branches yet — create them from Branches, then scope the dashboard with the branch switcher.
          </Text>
        ) : (
          branches.map((b: any) => (
            <Text key={String(b.branch?._id ?? b.branch?.name)} fontSize={13}>
              {b.branch?.name ?? 'Branch'} · {b.staffCount} staff · {b.upcomingEventCount} upcoming events
            </Text>
          ))
        )}
      </YStack>

      {places.length > 0 && (
        <YStack gap={4}>
          <Text fontSize={18} fontWeight="700">
            Where things live
          </Text>
          <XStack gap={12} flexWrap="wrap">
            {places.map((p) => (
              <Link key={p.href} href={p.href} style={{ fontSize: 13, color: '#0081cc', fontWeight: 600 }}>
                {p.label} →
              </Link>
            ))}
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}
