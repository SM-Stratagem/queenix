import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { Screen, Text, Card, Badge, Button } from '@queenix/ui';
import { useToast } from '@queenix/ui';
import {
  Receipt,
  FileText,
  Award,
  KeyRound,
  Check,
  X,
  Clock,
  ChevronRight,
} from '@tamagui/lucide-icons';

type ApprovalType = 'refund' | 'document' | 'cert' | 'access';

type Approval = {
  id: string;
  type: ApprovalType;
  title: string;
  requestor: string;
  detail: string;
  amount?: string;
  meta?: string;
  timeAgo: string;
};

const APPROVALS: Approval[] = [
  {
    id: '1',
    type: 'refund',
    title: 'Refund request — March membership',
    requestor: 'Aisha Hassan',
    amount: 'AED 1,200',
    detail: 'Reason: Moved abroad, unused 14 days',
    meta: 'Original txn #INV-24-1832',
    timeAgo: '12 min ago',
  },
  {
    id: '2',
    type: 'refund',
    title: 'Partial refund — PT package',
    requestor: 'Hala Al-Maktoum',
    amount: 'AED 850',
    detail: 'Reason: Trainer change requested, 2 unused sessions',
    meta: 'Original txn #INV-24-2104',
    timeAgo: '38 min ago',
  },
  {
    id: '3',
    type: 'document',
    title: 'Health declaration — re-sign',
    requestor: 'Reem Al-Suwaidi',
    detail: 'Document: Health waiver v3.2',
    meta: 'Last signed 11 months ago',
    timeAgo: '1 hr ago',
  },
  {
    id: '4',
    type: 'document',
    title: 'Liability waiver — new version',
    requestor: 'Maryam Al-Falasi',
    detail: 'Document: Liability waiver v4.0',
    meta: 'New terms effective this month',
    timeAgo: '2 hr ago',
  },
  {
    id: '5',
    type: 'cert',
    title: 'NASM CPT — renewal',
    requestor: 'Sarah Khalil',
    detail: 'Certificate: NASM Certified Personal Trainer',
    meta: 'Expires in 5 days',
    timeAgo: '3 hr ago',
  },
  {
    id: '6',
    type: 'cert',
    title: 'First Aid certification',
    requestor: 'Maya Patel',
    detail: 'Certificate: First Aid & CPR',
    meta: 'Expires in 14 days',
    timeAgo: 'Yesterday',
  },
  {
    id: '7',
    type: 'access',
    title: '24/7 access request',
    requestor: 'Latifa Al-Shamsi',
    detail: 'Special access: Off-peak hours (10 PM – 5 AM)',
    meta: 'Premium member for 18 months',
    timeAgo: '4 hr ago',
  },
];

const TABS: { key: 'all' | ApprovalType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'refund', label: 'Refunds' },
  { key: 'document', label: 'Documents' },
  { key: 'cert', label: 'Certs' },
  { key: 'access', label: 'Access' },
];

function typeIcon(t: ApprovalType) {
  switch (t) {
    case 'refund':
      return <Receipt size={20} color="$brand" />;
    case 'document':
      return <FileText size={20} color="$brand" />;
    case 'cert':
      return <Award size={20} color="$brand" />;
    case 'access':
      return <KeyRound size={20} color="$brand" />;
  }
}

function typeColor(t: ApprovalType) {
  switch (t) {
    case 'refund':
      return '$warning50';
    case 'document':
      return '$brand50';
    case 'cert':
      return '$success50';
    case 'access':
      return '$surfaceMuted';
  }
}

export default function OwnerApprovals() {
  const toast = useToast();
  const [tab, setTab] = useState<'all' | ApprovalType>('all');
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const filtered = APPROVALS.filter((a) => {
    if (tab === 'all') return true;
    return a.type === tab;
  });

  const pendingCount = APPROVALS.length - resolved.size;

  const handleApprove = (a: Approval) => {
    setResolved((prev) => new Set(prev).add(a.id));
    toast.success(`Approved: ${a.title}`);
  };

  const handleDecline = (a: Approval) => {
    setResolved((prev) => new Set(prev).add(a.id));
    toast.info(`Declined: ${a.title}`);
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
            <Text variant="h2">{pendingCount} pending</Text>
          </YStack>
          {pendingCount > 0 && (
            <Badge label={pendingCount.toString()} variant="warning" />
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
          {filtered.length === 0 && (
            <Card variant="filled">
              <YStack alignItems="center" padding="$6" gap="$2">
                <Check size={32} color="$success500" />
                <Text variant="body" weight="500">All caught up</Text>
                <Text variant="caption" color="muted" align="center">
                  No pending {tab === 'all' ? 'approvals' : `${tab} requests`} right now
                </Text>
              </YStack>
            </Card>
          )}

          {filtered.map((a) => {
            const isResolved = resolved.has(a.id);
            return (
              <Card key={a.id} variant="elevated" padding="md" opacity={isResolved ? 0.5 : 1}>
                <XStack alignItems="flex-start" gap="$3">
                  <YStack
                    backgroundColor={typeColor(a.type)}
                    padding="$2.5"
                    borderRadius="$md"
                  >
                    {typeIcon(a.type)}
                  </YStack>
                  <YStack flex={1} gap="$1">
                    <XStack alignItems="center" gap="$2" flexWrap="wrap">
                      <Text variant="body" weight="600" flex={1}>{a.title}</Text>
                      {a.amount && (
                        <Badge label={a.amount} variant="warning" />
                      )}
                    </XStack>
                    <Text variant="caption" color="muted">
                      Requested by {a.requestor}
                    </Text>
                    <Text variant="bodySmall" color="secondary">{a.detail}</Text>
                    {a.meta && (
                      <Text variant="caption" color="muted">{a.meta}</Text>
                    )}
                    <XStack alignItems="center" gap="$1.5" marginTop="$1">
                      <Clock size={12} color="$textMuted" />
                      <Text variant="caption" color="muted">{a.timeAgo}</Text>
                    </XStack>
                  </YStack>
                </XStack>

                {!isResolved && (
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
                )}

                {isResolved && (
                  <XStack alignItems="center" gap="$2" marginTop="$3">
                    <Check size={14} color="$success500" />
                    <Text variant="caption" color="success500" weight="600">Resolved</Text>
                  </XStack>
                )}
              </Card>
            );
          })}
        </YStack>
      </ScrollView>
    </Screen>
  );
}
