import React, { useMemo, useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Card, Avatar, Badge, Input, Chip } from '@queenix/ui';
import { Search, ChevronRight, TrendingUp, UserMinus, UserPlus } from '@tamagui/lucide-icons';

type MemberStatus = 'active' | 'trial' | 'frozen' | 'expiring' | 'past_due';
type Tier = 'Premium' | 'Group' | 'PT' | 'Trial';

type Member = {
  id: string;
  name: string;
  tier: Tier;
  status: MemberStatus;
  joinedAt: string;
  lastVisit: string;
};

const MEMBERS: Member[] = [
  { id: '1', name: 'Aisha Hassan', tier: 'Premium', status: 'active', joinedAt: 'Mar 2024', lastVisit: 'Today' },
  { id: '2', name: 'Reem Al-Suwaidi', tier: 'Premium', status: 'active', joinedAt: 'Jan 2024', lastVisit: 'Today' },
  { id: '3', name: 'Maryam Al-Falasi', tier: 'Group', status: 'active', joinedAt: 'Jun 2025', lastVisit: 'Yesterday' },
  { id: '4', name: 'Hala Al-Maktoum', tier: 'PT', status: 'active', joinedAt: 'Oct 2023', lastVisit: '2 days ago' },
  { id: '5', name: 'Noora Al-Khalifa', tier: 'Premium', status: 'expiring', joinedAt: 'Oct 2024', lastVisit: '3 days ago' },
  { id: '6', name: 'Fatima Al-Blooshi', tier: 'Trial', status: 'trial', joinedAt: 'Sep 2026', lastVisit: 'Today' },
  { id: '7', name: 'Shamma Al-Ameri', tier: 'Premium', status: 'frozen', joinedAt: 'Feb 2025', lastVisit: '12 days ago' },
  { id: '8', name: 'Amal Al-Mansoori', tier: 'Group', status: 'past_due', joinedAt: 'May 2024', lastVisit: '9 days ago' },
  { id: '9', name: 'Latifa Al-Shamsi', tier: 'PT', status: 'active', joinedAt: 'Nov 2023', lastVisit: 'Yesterday' },
  { id: '10', name: 'Mouza Al-Naqbi', tier: 'Premium', status: 'expiring', joinedAt: 'Oct 2024', lastVisit: 'Today' },
  { id: '11', name: 'Wadha Al-Mazrouei', tier: 'Group', status: 'active', joinedAt: 'Jul 2025', lastVisit: '4 days ago' },
  { id: '12', name: 'Shaikha Al-Dhaheri', tier: 'Trial', status: 'trial', joinedAt: 'Sep 2026', lastVisit: 'Today' },
];

const FILTERS: { key: 'all' | MemberStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'trial', label: 'Trial' },
  { key: 'frozen', label: 'Frozen' },
  { key: 'expiring', label: 'Expiring' },
  { key: 'past_due', label: 'Past due' },
];

function statusVariant(s: MemberStatus) {
  switch (s) {
    case 'active':
      return 'success' as const;
    case 'trial':
      return 'info' as const;
    case 'frozen':
      return 'warning' as const;
    case 'expiring':
      return 'warning' as const;
    case 'past_due':
      return 'danger' as const;
  }
}

function statusLabel(s: MemberStatus) {
  return s === 'past_due' ? 'Past due' : s.charAt(0).toUpperCase() + s.slice(1);
}

function tierVariant(t: Tier) {
  return t === 'Premium' || t === 'PT' ? 'brand' as const : 'info' as const;
}

export default function OwnerMembers() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | MemberStatus>('all');

  const filtered = useMemo(() => {
    return MEMBERS.filter((m) => {
      const matchQuery = query.length === 0 || m.name.toLowerCase().includes(query.toLowerCase());
      const matchFilter = filter === 'all' || m.status === filter;
      return matchQuery && matchFilter;
    });
  }, [query, filter]);

  return (
    <Screen scroll padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <YStack paddingHorizontal="$4" paddingTop="$4" paddingBottom="$2">
          <Text variant="caption" color="muted">Member directory</Text>
          <Text variant="h2">247 members</Text>
        </YStack>

        {/* Top stats */}
        <XStack paddingHorizontal="$4" marginTop="$3" gap="$3">
          <Card variant="outlined" padding="sm" flex={1}>
            <YStack gap="$1">
              <XStack alignItems="center" gap="$1.5">
                <UserPlus size={14} color="$success600" />
                <Text variant="caption" color="muted">New (30d)</Text>
              </XStack>
              <Text variant="h3">14</Text>
            </YStack>
          </Card>
          <Card variant="outlined" padding="sm" flex={1}>
            <YStack gap="$1">
              <XStack alignItems="center" gap="$1.5">
                <TrendingUp size={14} color="$brand" />
                <Text variant="caption" color="muted">Active</Text>
              </XStack>
              <Text variant="h3">218</Text>
            </YStack>
          </Card>
          <Card variant="outlined" padding="sm" flex={1}>
            <YStack gap="$1">
              <XStack alignItems="center" gap="$1.5">
                <UserMinus size={14} color="$danger500" />
                <Text variant="caption" color="muted">Churned</Text>
              </XStack>
              <Text variant="h3">6</Text>
            </YStack>
          </Card>
        </XStack>

        {/* Search */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Input
            placeholder="Search by name"
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
          {filtered.length === 0 && (
            <Card variant="filled">
              <YStack alignItems="center" padding="$4" gap="$2">
                <Text variant="body" color="muted">No members match your filters</Text>
              </YStack>
            </Card>
          )}

          {filtered.map((m) => (
            <Card
              key={m.id}
              variant="outlined"
              padding="sm"
              onPress={() => router.push(`/(owner)/members/${m.id}` as any)}
              accessibilityLabel={`View ${m.name} details`}
            >
              <XStack alignItems="center" gap="$3">
                <Avatar name={m.name} size="md" />
                <YStack flex={1} gap="$1">
                  <XStack alignItems="center" gap="$2" flexWrap="wrap">
                    <Text variant="body" weight="500">{m.name}</Text>
                    <Badge label={m.tier} variant={tierVariant(m.tier)} />
                  </XStack>
                  <XStack alignItems="center" gap="$2" flexWrap="wrap">
                    <Text variant="caption" color="muted">Joined {m.joinedAt}</Text>
                    <Text variant="caption" color="muted">•</Text>
                    <Text variant="caption" color="muted">Last visit {m.lastVisit}</Text>
                  </XStack>
                </YStack>
                <YStack alignItems="flex-end" gap="$1">
                  <Badge label={statusLabel(m.status)} variant={statusVariant(m.status)} />
                  <ChevronRight size={16} color="$textMuted" />
                </YStack>
              </XStack>
            </Card>
          ))}
        </YStack>

        {/* Footer summary */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="caption" color="muted" align="center">
            Showing {filtered.length} of {MEMBERS.length}
          </Text>
        </YStack>
      </ScrollView>
    </Screen>
  );
}
