import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import {
  Screen,
  Text,
  Card,
  Badge,
  Button,
  Skeleton,
  EmptyState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';
import {
  Receipt,
  FileText,
  Award,
  KeyRound,
  Check,
  X,
  Clock,
  Wallet,
} from '@tamagui/lucide-icons';

type ApprovalTab = 'all' | 'membership' | 'payment' | 'document' | 'trainer' | 'access' | 'payout';

const TABS: { key: ApprovalTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'membership', label: 'Membership' },
  { key: 'payment', label: 'Payments' },
  { key: 'document', label: 'Documents' },
  { key: 'trainer', label: 'Trainers' },
  { key: 'access', label: 'Access' },
  { key: 'payout', label: 'Payouts' },
];

type Approval = {
  _id: string;
  type:
    | 'membership.freeze_requested'
    | 'payment.refund_requested'
    | 'document.resign_requested'
    | 'trainer.cert_expiring'
    | 'access.override_requested'
    | 'payout.early_requested';
  requestorId: string;
  payload: any;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  createdAt: number;
  requestor?: { fullName?: string; email?: string } | null;
};

function typeIcon(t: Approval['type']) {
  switch (t) {
    case 'payment.refund_requested':
      return <Receipt size={20} color="$brand" />;
    case 'document.resign_requested':
      return <FileText size={20} color="$brand" />;
    case 'trainer.cert_expiring':
      return <Award size={20} color="$brand" />;
    case 'access.override_requested':
      return <KeyRound size={20} color="$brand" />;
    case 'payout.early_requested':
      return <Wallet size={20} color="$brand" />;
    case 'membership.freeze_requested':
      return <FileText size={20} color="$brand" />;
  }
}

function typeColor(t: Approval['type']) {
  switch (t) {
    case 'payment.refund_requested':
      return '$warning50';
    case 'document.resign_requested':
      return '$brand50';
    case 'trainer.cert_expiring':
      return '$success50';
    case 'access.override_requested':
      return '$surfaceMuted';
    case 'payout.early_requested':
      return '$warning50';
    case 'membership.freeze_requested':
      return '$info50';
  }
}

function matchesTab(type: Approval['type'], tab: ApprovalTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'membership') return type === 'membership.freeze_requested';
  if (tab === 'payment') return type === 'payment.refund_requested';
  if (tab === 'document') return type === 'document.resign_requested';
  if (tab === 'trainer') return type === 'trainer.cert_expiring';
  if (tab === 'access') return type === 'access.override_requested';
  if (tab === 'payout') return type === 'payout.early_requested';
  return true;
}

function formatAED(cents: number, currency: string = 'AED'): string {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function humanizeType(t: Approval['type']): string {
  switch (t) {
    case 'membership.freeze_requested':
      return 'Membership freeze';
    case 'payment.refund_requested':
      return 'Refund request';
    case 'document.resign_requested':
      return 'Document re-sign';
    case 'trainer.cert_expiring':
      return 'Trainer cert expiring';
    case 'access.override_requested':
      return 'Access override';
    case 'payout.early_requested':
      return 'Early payout';
  }
}

function buildTitle(a: Approval): string {
  const requestorName = a.requestor?.fullName ?? 'Member';
  switch (a.type) {
    case 'payout.early_requested':
      return `Early payout — ${requestorName}`;
    case 'membership.freeze_requested':
      return `Membership freeze — ${requestorName}`;
    case 'payment.refund_requested':
      return `Refund — ${requestorName}`;
    case 'document.resign_requested':
      return `Document re-sign — ${requestorName}`;
    case 'trainer.cert_expiring':
      return `Cert expiring — ${requestorName}`;
    case 'access.override_requested':
      return `Access override — ${requestorName}`;
  }
}

function buildDetail(a: Approval): { detail: string; meta?: string; amount?: string } {
  const p = (a.payload ?? {}) as Record<string, any>;
  switch (a.type) {
    case 'payout.early_requested':
      return {
        detail: p.note ? `Note: ${p.note}` : 'No note provided',
        amount: formatAED(p.amountCents ?? 0, p.currency ?? 'AED'),
      };
    case 'membership.freeze_requested':
      return { detail: `Freeze duration: ${p.days ?? 'unspecified'} days` };
    case 'payment.refund_requested':
      return {
        detail: p.reason ? `Reason: ${p.reason}` : 'No reason provided',
        amount: formatAED(p.amountCents ?? 0, p.currency ?? 'AED'),
        meta: p.invoiceId ? `Original txn ${p.invoiceId}` : undefined,
      };
    case 'document.resign_requested':
      return {
        detail: `Document: ${p.documentType ?? 'unknown'}`,
        meta: p.version ? `Version ${p.version}` : undefined,
      };
    case 'trainer.cert_expiring':
      return {
        detail: `Cert: ${p.certName ?? 'unknown'}`,
        meta: p.expiresAt
          ? `Expires ${new Date(p.expiresAt).toLocaleDateString('en-GB')}`
          : undefined,
      };
    case 'access.override_requested':
      return {
        detail: `Reason: ${p.reason ?? 'not specified'}`,
        meta: p.window ? `Window: ${p.window}` : undefined,
      };
  }
}

export default function OwnerApprovals() {
  const toast = useToast();
  const [tab, setTab] = useState<ApprovalTab>('all');
  const [decidedIds, setDecidedIds] = useState<Set<string>>(new Set());

  const approvalsQuery = useConvexQuery(api.queries.memberships.getApprovals, {
    status: 'pending',
    limit: 100,
  });
  const decideMutation = useConvexMutation(api.mutations.users.decideApproval);

  const isLoading = approvalsQuery === undefined;
  const allApprovals: Approval[] = (approvalsQuery ?? []) as Approval[];

  const pending = allApprovals.filter((a) => a.status === 'pending');
  const filtered = pending
    .filter((a) => matchesTab(a.type, tab))
    .filter((a) => !decidedIds.has(a._id));

  const handleApprove = async (a: Approval) => {
    setDecidedIds((prev) => new Set(prev).add(a._id));
    try {
      await decideMutation({ approvalId: a._id as any, decision: 'approved' });
      toast.success(`Approved: ${humanizeType(a.type)}`);
    } catch (e: any) {
      setDecidedIds((prev) => {
        const next = new Set(prev);
        next.delete(a._id);
        return next;
      });
      toast.show(e?.message ?? 'Failed to approve', 'error');
    }
  };

  const handleDecline = async (a: Approval) => {
    setDecidedIds((prev) => new Set(prev).add(a._id));
    try {
      await decideMutation({ approvalId: a._id as any, decision: 'denied' });
      toast.show(`Declined: ${humanizeType(a.type)}`, 'info');
    } catch (e: any) {
      setDecidedIds((prev) => {
        const next = new Set(prev);
        next.delete(a._id);
        return next;
      });
      toast.show(e?.message ?? 'Failed to decline', 'error');
    }
  };

  return (
    <Screen scroll padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <XStack
          paddingTop="$4"
          paddingHorizontal="$4"
          paddingBottom="$3"
          alignItems="center"
          justifyContent="space-between"
        >
          <YStack>
            <Text variant="caption" color="muted">Approvals queue</Text>
            <Text variant="h2">
              {isLoading ? '…' : `${filtered.length} pending`}
            </Text>
          </XStack>
          {filtered.length > 0 && (
            <Badge label={filtered.length.toString()} variant="warning" />
          )}
        </XStack>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {TABS.map((t) => (
            <YStack
              key={t.key}
              paddingVertical="$2.5"
              paddingHorizontal="$4"
              borderRadius="$full"
              backgroundColor={tab === t.key ? '$brand' : '$surfaceMuted'}
              onPress={() => setTab(t.key)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${t.label}`}
              pressStyle={{ opacity: 0.85 }}
            >
              <Text
                variant="bodySmall"
                weight="600"
                color={tab === t.key ? '$textOnBrand' : '$textSecondary'}
              >
                {t.label}
              </Text>
            </YStack>
          ))}
        </ScrollView>

        {/* Approvals list */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          {isLoading ? (
            <>
              <Skeleton height={140} borderRadius="$md" />
              <Skeleton height={140} borderRadius="$md" />
              <Skeleton height={140} borderRadius="$md" />
            </>
          ) : filtered.length === 0 ? (
            <Card variant="filled">
              <YStack alignItems="center" padding="$6" gap="$2">
                <Check size={32} color="$success500" />
                <Text variant="body" weight="500">All caught up</Text>
                <Text variant="caption" color="muted" align="center">
                  {tab === 'all'
                    ? 'No pending approvals right now'
                    : `No ${tab} requests pending`}
                </Text>
              </YStack>
            </Card>
          ) : (
            filtered.map((a) => {
              const { detail, meta, amount } = buildDetail(a);
              return (
                <Card key={a._id} variant="elevated" padding="md">
                  <XStack alignItems="flex-start" gap="$3">
                    <YStack backgroundColor={typeColor(a.type)} padding="$2.5" borderRadius="$md">
                      {typeIcon(a.type)}
                    </YStack>
                    <YStack flex={1} gap="$1">
                      <XStack alignItems="center" gap="$2" flexWrap="wrap">
                        <Text variant="body" weight="600" flex={1}>
                          {buildTitle(a)}
                        </Text>
                        {amount && <Badge label={amount} variant="warning" />}
                      </XStack>
                      <Text variant="caption" color="muted">
                        {humanizeType(a.type)} • {a.requestor?.email ?? '—'}
                      </Text>
                      <Text variant="bodySmall" color="secondary">
                        {detail}
                      </Text>
                      {meta && <Text variant="caption" color="muted">{meta}</Text>}
                      <XStack alignItems="center" gap="$1.5" marginTop="$1">
                        <Clock size={12} color="$textMuted" />
                        <Text variant="caption" color="muted">
                          {new Date(a.createdAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </XStack>
                    </YStack>
                  </XStack>

                  <XStack gap="$2" marginTop="$3">
                    <Button
                      label="Decline"
                      variant="outline"
                      size="sm"
                      flex={1}
                      icon={<X size={16} color="$textPrimary" />}
                      onPress={() => handleDecline(a)}
                    />
                    <Button
                      label="Approve"
                      variant="primary"
                      size="sm"
                      flex={1}
                      icon={<Check size={16} color="$textOnBrand" />}
                      onPress={() => handleApprove(a)}
                    />
                  </XStack>
                </Card>
              );
            })
          )}
        </YStack>
      </ScrollView>
    </Screen>
  );
}
