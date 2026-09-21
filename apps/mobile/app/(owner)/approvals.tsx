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

export default function ApprovalsScreen() {
  const toast = useToast();
  const [tab, setTab] = useState<ApprovalTab>('all');

  const approvals = useConvexQuery(api.queries.memberships.getApprovals, {
    status: 'pending',
  }) as Approval[] | undefined;
  const isLoading = approvals === undefined;

  const decide = useConvexMutation(api.mutations.users.decideApproval);

  const filtered = (approvals ?? []).filter((a) =>
    tab === 'all' ? true : a.type.startsWith(tab + '.')
  );

  const handleApprove = async (a: Approval) => {
    try {
      await decide({ approvalId: a._id, decision: 'approved' });
      toast.success('Approved');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  };

  const handleDecline = async (a: Approval) => {
    try {
      await decide({ approvalId: a._id, decision: 'denied' });
      toast.success('Declined');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
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
                  <Text variant="body" weight="600">{a.type}</Text>
                  <Text variant="caption" color="muted">
                    {a.requestor?.email ?? '—'}
                  </Text>
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
