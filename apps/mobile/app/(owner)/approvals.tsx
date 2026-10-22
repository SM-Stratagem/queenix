import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import {
  Screen,
  Text,
  Card,
  Badge,
  Button,
  Skeleton,
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
} from '@tamagui/lucide-icons-2';

type ApprovalTab = 'all' | 'membership' | 'payment' | 'document' | 'trainer' | 'access' | 'payout' | 'timeoff';

const TABS: { key: ApprovalTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'membership', label: 'Membership' },
  { key: 'payment', label: 'Payments' },
  { key: 'document', label: 'Documents' },
  { key: 'trainer', label: 'Trainers' },
  { key: 'access', label: 'Access' },
  { key: 'payout', label: 'Payouts' },
  { key: 'timeoff', label: 'Time off' },
];

type Approval = {
  _id: string;
  type:
    | 'membership.freeze_requested'
    | 'payment.refund_requested'
    | 'document.resign_requested'
    | 'trainer.cert_expiring'
    | 'access.override_requested'
    | 'payout.early_requested'
    | 'timeoff.leave'
    | 'timeoff.sick';
  /** 'timeoff' rows come from staffTimeOff (decideTimeOff), not the approvals table. */
  source?: 'timeoff';
  requestorId: string;
  payload: any;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  createdAt: number;
  requestor?: { fullName?: string; email?: string } | null;
  requester?: { name?: string; fullName?: string; email?: string } | null;
};

const errMsg = (e: any) => e?.data?.message ?? e?.message ?? 'Failed';

export default function ApprovalsScreen() {
  const toast = useToast();
  const [tab, setTab] = useState<ApprovalTab>('all');

  const approvalRows = useConvexQuery(api.queries.memberships.getApprovals, {
    status: 'pending',
  }) as Approval[] | undefined;
  // Staff time-off requests (trainer/ops mobile) live in staffTimeOff.
  const timeOffRows = useConvexQuery((api.queries as any).teamOrg.timeOffList, { status: 'pending' }) as
    | Array<{ record: any; user: any }>
    | undefined;
  const isLoading = approvalRows === undefined || timeOffRows === undefined;

  const decide = useConvexMutation(api.mutations.users.decideApproval);
  const decideTimeOff = useConvexMutation((api.mutations as any).teamOrg.decideTimeOff);

  const approvals: Approval[] = [
    ...(approvalRows ?? []),
    ...(timeOffRows ?? []).map(({ record, user }) => ({
      _id: record._id,
      source: 'timeoff' as const,
      type: `timeoff.${record.kind}` as Approval['type'],
      requestorId: record.userId,
      payload: { date: record.date, note: record.note },
      status: record.status,
      createdAt: record.createdAt,
      requestor: user ? { fullName: user.fullName, email: user.email } : null,
    })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  const run = (a: Approval, decision: 'approved' | 'denied') =>
    a.source === 'timeoff'
      ? decideTimeOff({ timeOffId: a._id, decision })
      : decide({ approvalId: a._id, decision });

  const filtered = approvals.filter((a) =>
    tab === 'all' ? true : a.type.startsWith(tab + '.')
  );

  const handleApprove = async (a: Approval) => {
    try {
      await run(a, 'approved');
      toast.success('Approved');
    } catch (e: any) {
      toast.error(errMsg(e));
    }
  };

  const handleDecline = async (a: Approval) => {
    try {
      await run(a, 'denied');
      toast.success('Declined');
    } catch (e: any) {
      toast.error(errMsg(e));
    }
  };

  return (
    <Screen scroll padded={false}>
      <YStack paddingTop="$4" paddingHorizontal="$4" paddingBottom="$3" gap="$2">
        <XStack alignItems="center" justifyContent="space-between">
          <YStack>
            <Text variant="caption" color="muted">Approvals queue</Text>
            <Text variant="h2">{isLoading ? '…' : `${filtered.length} pending`}</Text>
          </YStack>
          {filtered.length > 0 ? <Badge label={filtered.length.toString()} variant="warning" /> : null}
        </XStack>
      </YStack>

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
            role="button"
            aria-label={`Filter by ${t.label}`}
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

      <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
        {isLoading ? (
          <YStack gap="$3">
            <Skeleton height={140} borderRadius="$md" />
            <Skeleton height={140} borderRadius="$md" />
            <Skeleton height={140} borderRadius="$md" />
          </YStack>
        ) : filtered.length === 0 ? (
          <Card variant="filled">
            <YStack alignItems="center" padding="$6" gap="$2">
              <Check size={32} color="$success500" />
              <Text variant="body" weight="500">All caught up</Text>
              <Text variant="caption" color="muted" align="center">
                {tab === 'all' ? 'No pending approvals right now' : `No ${tab} requests pending`}
              </Text>
            </YStack>
          </Card>
        ) : (
          filtered.map((a) => (
            <Card key={a._id} variant="elevated" padding="md">
              <XStack alignItems="flex-start" gap="$3">
                <YStack backgroundColor="$brand50" padding="$2.5" borderRadius="$md">
                  <FileText size={20} color="$brand" />
                </YStack>
                <YStack flex={1} gap="$1">
                  <Text variant="body" weight="600">
                    {a.source === 'timeoff'
                      ? `${a.type === 'timeoff.sick' ? 'Sick day' : 'Leave'} · ${a.payload?.date ?? ''}`
                      : a.type}
                  </Text>
                  <Text variant="caption" color="muted">
                    {a.requestor?.fullName ?? a.requester?.fullName ?? a.requester?.name ?? ''}{' '}
                    {a.requestor?.email ?? a.requester?.email ?? '—'}
                  </Text>
                  {a.source === 'timeoff' && a.payload?.note ? (
                    <Text variant="caption" color="secondary">{a.payload.note}</Text>
                  ) : null}
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
                  onPress={() => handleDecline(a)}
                />
                <Button
                  label="Approve"
                  variant="primary"
                  size="sm"
                  flex={1}
                  onPress={() => handleApprove(a)}
                />
              </XStack>
            </Card>
          ))
        )}
      </YStack>
    </Screen>
  );
}

export { ScreenError as ErrorBoundary } from '@/components/common/ScreenError';
