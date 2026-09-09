import React, { useMemo, useState, useEffect } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Badge,
  Input,
  Chip,
  Skeleton,
  EmptyState,
  ErrorState,
} from '@queenix/ui';
import { useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';
import {
  Search,
  ChevronRight,
  TrendingUp,
  UserMinus,
  UserPlus,
} from '@tamagui/lucide-icons';

type MembershipStatus =
  | 'active'
  | 'trial'
  | 'frozen'
  | 'expiring'
  | 'past_due'
  | 'pending'
  | 'cancelled'
  | 'expired'
  | 'all';

const FILTERS: { key: MembershipStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'trial', label: 'Trial' },
  { key: 'frozen', label: 'Frozen' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'expired', label: 'Expired' },
];

function statusVariant(s: MembershipStatus) {
  switch (s) {
    case 'active':
      return 'success' as const;
    case 'trial':
      return 'info' as const;
    case 'frozen':
      return 'warning' as const;
    case 'pending':
      return 'info' as const;
    case 'cancelled':
      return 'danger' as const;
    case 'expired':
      return 'warning' as const;
    case 'past_due':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

function statusLabel(s: MembershipStatus) {
  return s === 'past_due'
    ? 'Past due'
    : s === 'all'
      ? 'All'
      : s.charAt(0).toUpperCase() + s.slice(1);
}

export default function OwnerMembers() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MembershipStatus>('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const membersQuery = useConvexQuery(
    api.queries.users.getMembersDirectory,
    {
      search: debouncedQuery || undefined,
      status: filter,
      limit: 100,
    } as any
  );

  const isLoading = membersQuery === undefined;
  const members = membersQuery ?? [];

  const counts = useMemo(() => {
    const active = members.filter((m: any) => m.membership?.status === 'active').length;
    const trial = members.filter((m: any) => m.membership?.status === 'trial').length;
    const frozen = members.filter((m: any) => m.membership?.status === 'frozen').length;
    return { active, trial, frozen };
  }, [members]);

  return (
    <Screen scroll padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <YStack paddingHorizontal="$4" paddingTop="$4" paddingBottom="$2">
          <Text variant="caption" color="muted">Member directory</Text>
          <Text variant="h2">
            {isLoading ? '…' : `${members.length} member${members.length === 1 ? '' : 's'}`}
          </Text>
        </YStack>

        {/* Top stats */}
        <XStack paddingHorizontal="$4" marginTop="$3" gap="$3">
          <Card variant="outlined" padding="sm" flex={1}>
            <YStack gap="$1">
              <XStack alignItems="center" gap="$1.5">
                <UserPlus size={14} color="$success600" />
                <Text variant="caption" color="muted">Trial</Text>
              </XStack>
              {isLoading ? (
                <Skeleton width={40} height={24} />
              ) : (
                <Text variant="h3">{counts.trial}</Text>
              )}
            </YStack>
          </Card>
          <Card variant="outlined" padding="sm" flex={1}>
            <YStack gap="$1">
              <XStack alignItems="center" gap="$1.5">
                <TrendingUp size={14} color="$brand" />
                <Text variant="caption" color="muted">Active</Text>
              </XStack>
              {isLoading ? (
                <Skeleton width={40} height={24} />
              ) : (
                <Text variant="h3">{counts.active}</Text>
              )}
            </YStack>
          </Card>
          <Card variant="outlined" padding="sm" flex={1}>
            <YStack gap="$1">
              <XStack alignItems="center" gap="$1.5">
                <UserMinus size={14} color="$warning500" />
                <Text variant="caption" color="muted">Frozen</Text>
              </XStack>
              {isLoading ? (
                <Skeleton width={40} height={24} />
              ) : (
                <Text variant="h3">{counts.frozen}</Text>
              )}
            </YStack>
          </Card>
        </XStack>

        {/* Search */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Input
            placeholder="Search by name, email or phone"
            value={query}
            onChangeText={setQuery}
            leftIcon={<Search size={18} color="$textMuted" />}
            accessibilityLabel="Search members"
          />
        </YStack>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 12 }}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              selected={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>

        {/* Member list */}
        <YStack paddingHorizontal="$4" gap="$2">
          {isLoading ? (
            <>
              <Skeleton height={80} borderRadius="$md" />
              <Skeleton height={80} borderRadius="$md" />
              <Skeleton height={80} borderRadius="$md" />
            </>
          ) : members.length === 0 ? (
            <EmptyState
              icon={<Search size={32} color="$textMuted" />}
              title="No members found"
              message={
                query
                  ? `No results for "${query}"`
                  : 'No members match the selected filter'
              }
            />
          ) : (
            members.map((m: any) => {
              const status: MembershipStatus = (m.membership?.status ?? 'pending') as MembershipStatus;
              const fullName = m.user?.fullName ?? 'Member';
              return (
                <Card
                  key={m.user._id}
                  variant="outlined"
                  padding="sm"
                  onPress={() => router.push(`/(owner)/members/${m.user._id}` as any)}
                  accessibilityLabel={`View ${fullName} details`}
                >
                  <XStack alignItems="center" gap="$3">
                    <Avatar name={fullName} size="md" />
                    <YStack flex={1} gap="$1">
                      <XStack alignItems="center" gap="$2" flexWrap="wrap">
                        <Text variant="body" weight="500">
                          {fullName}
                        </Text>
                        {status !== 'all' && m.membership && (
                          <Badge label={statusLabel(status)} variant={statusVariant(status)} />
                        )}
                      </XStack>
                      <XStack alignItems="center" gap="$2" flexWrap="wrap">
                        <Text variant="caption" color="muted">
                          {m.user.email}
                        </Text>
                      </XStack>
                    </YStack>
                    <YStack alignItems="flex-end" gap="$1">
                      {m.membership?.endDate && (
                        <Text variant="caption" color="muted">
                          Until{' '}
                          {new Date(m.membership.endDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </Text>
                      )}
                      <ChevronRight size={16} color="$textMuted" />
                    </YStack>
                  </XStack>
                </Card>
              );
            })
          )}
        </YStack>

        {!isLoading && members.length > 0 && (
          <YStack paddingHorizontal="$4" marginTop="$4">
            <Text variant="caption" color="muted" align="center">
              Showing {members.length} member{members.length === 1 ? '' : 's'}
            </Text>
          </YStack>
        )}
      </ScrollView>
    </Screen>
  );
}
