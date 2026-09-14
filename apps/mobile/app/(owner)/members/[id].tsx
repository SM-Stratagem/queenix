import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Screen,
  Header,
  Text,
  Card,
  Avatar,
  Button,
  Badge,
  Chip,
  Divider,
  Skeleton,
  EmptyState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';
import { Section, KeyValue, Stat } from '@/components/member-detail/primitives';
import { formatCents } from '@/components/member-detail/format';
import {
  OverviewTab,
  ActivityTab,
  MembershipTab,
} from '@/components/member-detail/tabs';
import {
  MoreVertical,
  MessageCircle,
  Snowflake,
  CreditCard,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Car,
  Activity,
  TrendingUp,
  CalendarCheck,
  Dumbbell,
  FileText,
  Edit3,
} from '@tamagui/lucide-icons';
import { Pressable } from 'react-native';

type Tab = 'overview' | 'activity' | 'membership' | 'payments' | 'notes';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'membership', label: 'Membership' },
  { key: 'payments', label: 'Payments' },
  { key: 'notes', label: 'Notes' },
];

export default function OwnerMemberDetail() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const [tab, setTab] = useState<Tab>('overview');

  const memberId = (params.id as string) || '';
  const detailQuery = useConvexQuery(
    api.queries.users.getOwnerMemberDetail,
    memberId ? ({ memberId: memberId as any } as any) : 'skip'
  );
  const isLoading = detailQuery === undefined;

  if (isLoading) {
    return (
      <Screen padded={false}>
        <Header showBack onBack={() => router.back()} title="Member" />
        <YStack padding="$4" gap="$3">
          <Skeleton height={140} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </YStack>
      </Screen>
    );
  }

  if (!detailQuery || !detailQuery.member) {
    return (
      <Screen padded={false}>
        <Header showBack onBack={() => router.back()} title="Member" />
        <YStack padding="$4">
          <EmptyState
            title="Member not found"
            message="This member may have been removed."
          />
        </YStack>
      </Screen>
    );
  }

  const {
    member,
    profile,
    activeMembership,
    memberships,
    payments,
    visits,
    notes,
  } = detailQuery;

  const fullName = member.fullName ?? 'Member';
  const totalSpentCents = payments
    .filter((p: any) => p.status === 'succeeded')
    .reduce((acc: number, p: any) => acc + p.amountCents, 0);
  const lastVisit = visits[0];
  const lastVisitLabel = lastVisit
    ? new Date(lastVisit.timestamp).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <Screen padded={false}>
      <Header
        showBack
        onBack={() => router.back()}
        title="Member"
        right={
          <Pressable
            onPress={() => toast.info('More actions — coming soon')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="More actions"
          >
            <MoreVertical size={20} color="$textPrimary" />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile header */}
        <YStack paddingHorizontal="$4" paddingTop="$3">
          <Card variant="elevated" padding="lg">
            <XStack gap="$3" alignItems="flex-start">
              <Avatar name={fullName} size="xl" />
              <YStack flex={1} gap="$1.5">
                <Text variant="h2" numberOfLines={1}>
                  {fullName}
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {activeMembership ? (
                    <Badge label={activeMembership.status} variant="success" />
                  ) : (
                    <Badge label="No membership" variant="warning" />
                  )}
                </XStack>
                <Text variant="caption" color="muted">
                  Member since{' '}
                  {new Date(member.createdAt).toLocaleDateString('en-GB', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </YStack>
            </XStack>
            <XStack gap="$2" marginTop="$3">
              <Button
                label="Message"
                variant="primary"
                size="sm"
                icon={<MessageCircle size={16} color="$textOnBrand" />}
                onPress={() => toast.info('Opening chat…')}
                accessibilityLabel="Message member"
                flex={1}
              />
              <Button
                label="Freeze"
                variant="outline"
                size="sm"
                icon={<Snowflake size={16} color="$brand" />}
                onPress={() => toast.info('Freeze flow — coming soon')}
                accessibilityLabel="Freeze membership"
                flex={1}
              />
            </XStack>
          </Card>
        </YStack>

        {/* Quick stats */}
        <XStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <Stat label="Visits (30d)" value={visits.length.toString()} flex={1} />
          <Stat label="Total spent" value={formatCents(totalSpentCents)} flex={1} />
          <Stat label="Last visit" value={lastVisitLabel} flex={1} />
        </XStack>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 12 }}
        >
          {TABS.map((t) => (
            <Chip
              key={t.key}
              label={t.label}
              selected={tab === t.key}
              onPress={() => setTab(t.key)}
            />
          ))}
        </ScrollView>

        {tab === 'overview' && (
          <OverviewTab member={member} profile={profile} />
        )}

        {tab === 'activity' && (
          <YStack paddingHorizontal="$4" gap="$2">
            <Text variant="h4">Recent visits</Text>
            {visits.length === 0 ? (
              <EmptyState
                icon={<Activity size={32} color="$textMuted" />}
                title="No recent activity"
                message="This member has not visited the gym recently."
              />
            ) : (
              visits.map((v: any) => (
                <Card key={v._id} variant="outlined" padding="sm">
                  <XStack alignItems="center" gap="$3">
                    <YStack
                      backgroundColor={v.granted ? '$success50' : '$danger50'}
                      padding="$2.5"
                      borderRadius="$md"
                    >
                      <Activity
                        size={18}
                        color={v.granted ? '$success500' : '$danger500'}
                      />
                    </YStack>
                    <YStack flex={1}>
                      <Text variant="bodySmall" weight="600">
                        {v.direction === 'in' ? 'Check-in' : 'Check-out'}
                        {v.accessPointId ? ` • ${v.accessPointId}` : ''}
                      </Text>
                      <Text variant="caption" color="muted">
                        {new Date(v.timestamp).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {v.reason ? ` — ${v.reason}` : ''}
                      </Text>
                    </YStack>
                    <Badge
                      label={v.granted ? 'Granted' : 'Denied'}
                      variant={v.granted ? 'success' : 'danger'}
                      size="sm"
                    />
                  </XStack>
                </Card>
              ))
            )}
          </YStack>
        )}

        {tab === 'membership' && (
          <YStack paddingHorizontal="$4" gap="$3">
            {memberships.length === 0 ? (
              <EmptyState
                title="No memberships"
                message="This member has no membership records."
              />
            ) : (
              memberships.map((m: any) => (
                <Card key={m._id} variant="outlined" padding="sm">
                  <YStack gap="$2">
                    <XStack justifyContent="space-between" alignItems="flex-start">
                      <YStack flex={1}>
                        <Text variant="label">Membership</Text>
                        <Text variant="caption" color="muted">
                          {new Date(m.startDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          –{' '}
                          {new Date(m.endDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </YStack>
                      <Badge
                        label={m.status}
                        variant={
                          m.status === 'active'
                            ? 'success'
                            : m.status === 'cancelled'
                              ? 'danger'
                              : m.status === 'frozen'
                                ? 'warning'
                                : 'neutral'
                        }
                      />
                    </XStack>
                    <XStack gap="$3">
                      <YStack flex={1}>
                        <Text variant="caption" color="muted">
                          Classes
                        </Text>
                        <Text variant="bodySmall" weight="600">
                          {m.remainingClasses}
                        </Text>
                      </YStack>
                      <YStack flex={1}>
                        <Text variant="caption" color="muted">
                          PT sessions
                        </Text>
                        <Text variant="bodySmall" weight="600">
                          {m.remainingPTSessions}
                        </Text>
                      </YStack>
                      <YStack flex={1}>
                        <Text variant="caption" color="muted">
                          Auto-renew
                        </Text>
                        <Text variant="bodySmall" weight="600">
                          {m.autoRenew ? 'On' : 'Off'}
                        </Text>
                      </YStack>
                    </XStack>
                  </YStack>
                </Card>
              ))
            )}
          </YStack>
        )}

        {tab === 'payments' && (
          <YStack paddingHorizontal="$4" gap="$2">
            <Text variant="h4">Recent payments</Text>
            {payments.length === 0 ? (
              <EmptyState
                icon={<CreditCard size={32} color="$textMuted" />}
                title="No payments yet"
                message="Payment history will appear here."
              />
            ) : (
              payments.map((p: any) => (
                <Card key={p._id} variant="outlined" padding="sm">
                  <XStack alignItems="center" gap="$3">
                    <YStack
                      backgroundColor={
                        p.status === 'succeeded'
                          ? '$success50'
                          : p.status === 'refunded'
                            ? '$info50'
                            : p.status === 'failed'
                              ? '$danger50'
                              : '$warning50'
                      }
                      padding="$2.5"
                      borderRadius="$md"
                    >
                      <CreditCard
                        size={18}
                        color={
                          p.status === 'succeeded'
                            ? '$success500'
                            : p.status === 'refunded'
                              ? '$info500'
                              : p.status === 'failed'
                                ? '$danger500'
                                : '$warning500'
                        }
                      />
                    </YStack>
                    <YStack flex={1}>
                      <Text variant="bodySmall" weight="600">
                        {p.description ?? p.type}
                      </Text>
                      <Text variant="caption" color="muted">
                        {new Date(p.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </YStack>
                    <YStack alignItems="flex-end">
                      <Text
                        variant="label"
                        color={p.status === 'refunded' ? 'muted' : 'primary'}
                      >
                        {formatCents(p.amountCents, p.currency)}
                      </Text>
                      <Badge
                        label={p.status}
                        variant={
                          p.status === 'succeeded'
                            ? 'success'
                            : p.status === 'refunded'
                              ? 'info'
                              : p.status === 'failed'
                                ? 'danger'
                                : 'warning'
                        }
                        size="sm"
                      />
                    </YStack>
                  </XStack>
                </Card>
              ))
            )}
          </YStack>
        )}

        {tab === 'notes' && (
          <YStack paddingHorizontal="$4" gap="$2">
            {notes.length === 0 ? (
              <EmptyState
                icon={<FileText size={32} color="$textMuted" />}
                title="No notes"
                message="No trainer notes for this member yet."
              />
            ) : (
              notes.map((n: any) => (
                <Card key={n._id} variant="outlined" padding="sm">
                  <XStack alignItems="flex-start" gap="$2">
                    <FileText size={16} color="$textMuted" />
                    <YStack flex={1} gap="$0.5">
                      <Text variant="caption" color="muted">
                        {new Date(n.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                      <Text variant="bodySmall" color="secondary">
                        {n.note}
                      </Text>
                    </YStack>
                  </XStack>
                </Card>
              ))
            )}
            <Button
              label="Add note"
              variant="outline"
              size="md"
              icon={<Edit3 size={16} color="$brand" />}
              onPress={() => toast.info('Add note — coming soon')}
            />
          </YStack>
        )}
      </ScrollView>
    </Screen>
  );
}

