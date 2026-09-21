'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { api } from '@queenix/convex';
import { AdminShell } from '@/components/admin/AdminShell';
import { RequireAuth } from '@/components/RequireAuth';
import { formatAed } from '../../components/finance/OverviewCards';

type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'cancelled';

type Approval = {
  _id: string;
  type: string;
  requestorId: string;
  payload: any;
  status: ApprovalStatus;
  createdAt: number;
  requestor?: { fullName?: string; email?: string } | null;
};

const TYPE_TABS = ['all', 'membership', 'payment', 'document', 'trainer', 'access', 'payout'];
const STATUS_TABS: ApprovalStatus[] = ['pending', 'approved', 'denied', 'cancelled'];

function typeLabel(type: string): string {
  const prefix = type.split('.')[0] ?? type;
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function payloadSummary(payload: any): string {
  if (!payload || typeof payload !== 'object') return '—';
  const parts: string[] = [];
  if (typeof payload.amountCents === 'number') {
    parts.push(formatAed(payload.amountCents));
  }
  for (const key of ['reason', 'note', 'planName', 'membershipType', 'documentName']) {
    if (typeof payload[key] === 'string' && payload[key].trim()) parts.push(payload[key].trim());
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export default function ApprovalsPage() {
  const [status, setStatus] = useState<ApprovalStatus>('pending');
  const [type, setType] = useState('all');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const approvals = useQuery(api.queries.memberships.getApprovals, { status, limit: 100 });
  const decide = useMutation(api.mutations.users.decideApproval);

  const items = ((approvals as Approval[] | undefined) ?? []).filter(
    (a) => type === 'all' || a.type.startsWith(`${type}.`)
  );

  async function handleDecide(a: Approval, decision: 'approved' | 'denied' | 'cancelled') {
    try {
      await decide({
        approvalId: a._id as any,
        decision,
        note: notes[a._id]?.trim() || undefined,
      });
      setNotice(`Request ${decision}.`);
      setNotes((n) => {
        const next = { ...n };
        delete next[a._id];
        return next;
      });
    } catch (e: any) {
      setNotice(e?.data?.message ?? e?.message ?? 'Decision failed.');
    }
  }

  return (
    <RequireAuth>
      <AdminShell>
        <YStack gap={20} padding={24}>
          <YStack gap={4}>
            <Text fontSize={28} fontWeight="800">
              Approvals
            </Text>
            <Text fontSize={13} opacity={0.6}>
              Membership, payment, document, trainer, access and payout requests awaiting
              a finance decision (staff only)
            </Text>
          </YStack>

          {notice && (
            <Text fontSize={13} fontWeight="600" color="#0081cc">
              {notice}
            </Text>
          )}

          <XStack gap={8} flexWrap="wrap" alignItems="center">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: status === s ? '#0081cc' : 'transparent',
                  color: status === s ? 'white' : 'var(--text)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </XStack>

          <XStack gap={8} flexWrap="wrap" alignItems="center">
            {TYPE_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: type === t ? 'var(--text)' : 'transparent',
                  color: type === t ? 'var(--bg)' : 'var(--text)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </XStack>

          {approvals === undefined ? (
            <Text fontSize={13} opacity={0.6}>
              Loading approvals…
            </Text>
          ) : items.length === 0 ? (
            <Text fontSize={13} opacity={0.6}>
              {status === 'pending' ? 'No pending requests — everything is decided.' : `No ${status} requests.`}
            </Text>
          ) : (
            <YStack gap={8}>
              {items.map((a) => (
                <YStack
                  key={a._id}
                  gap={8}
                  padding={14}
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="$borderColor"
                  backgroundColor="$background"
                >
                  <XStack gap={12} alignItems="center" flexWrap="wrap">
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: '#0081cc20',
                        color: 'var(--brand)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {typeLabel(a.type)}
                    </span>
                    <YStack flex={2} gap={1}>
                      <Text fontSize={14} fontWeight="600">
                        {a.requestor?.fullName ?? 'Unknown member'}
                      </Text>
                      <Text fontSize={12} opacity={0.6}>
                        {a.requestor?.email ?? ''} · {a.type} ·{' '}
                        {new Date(a.createdAt).toLocaleDateString('en-AE', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </YStack>
                    <Text fontSize={14} fontWeight="700">
                      {payloadSummary(a.payload)}
                    </Text>
                  </XStack>
                  {status === 'pending' ? (
                    <XStack gap={8} flexWrap="wrap" alignItems="center">
                      <input
                        placeholder="Decision note (optional)"
                        value={notes[a._id] ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [a._id]: e.target.value }))}
                        style={{
                          padding: 6,
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          minWidth: 220,
                          flex: 1,
                        }}
                      />
                      <button
                        onClick={() => handleDecide(a, 'approved')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#10b981',
                          color: 'white',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDecide(a, 'denied')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          border: '1px solid #dc2626',
                          background: 'white',
                          color: '#dc2626',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Deny
                      </button>
                    </XStack>
                  ) : (
                    <Text fontSize={12} opacity={0.6} style={{ textTransform: 'capitalize' }}>
                      {a.status}
                    </Text>
                  )}
                </YStack>
              ))}
            </YStack>
          )}
        </YStack>
      </AdminShell>
    </RequireAuth>
  );
}
