import React, { useState, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Input,
  Chip,
  Badge,
  Divider,
  EmptyState,
} from '@queenix/ui';
import { Search, ChevronRight, Users } from '@tamagui/lucide-icons';

type ClientStatus = 'active' | 'new' | 'attention';

interface Client {
  id: string;
  name: string;
  lastSessionDays: number; // days since last session
  totalSessions: number;
  nextSession?: string; // human-readable
  status: ClientStatus;
  goal: string;
}

const mockClients: Client[] = [
  {
    id: 'c1',
    name: 'Amna Al-Mazrouei',
    lastSessionDays: 2,
    totalSessions: 24,
    nextSession: 'Mon, 07:00',
    status: 'active',
    goal: 'Strength',
  },
  {
    id: 'c2',
    name: 'Fatima Saeed',
    lastSessionDays: 1,
    totalSessions: 18,
    nextSession: 'Tomorrow, 08:30',
    status: 'active',
    goal: 'Weight loss',
  },
  {
    id: 'c3',
    name: 'Hala Al-Suwaidi',
    lastSessionDays: 0,
    totalSessions: 32,
    nextSession: 'Today, 10:00',
    status: 'active',
    goal: 'Rehab',
  },
  {
    id: 'c4',
    name: 'Mariam Al-Hashimi',
    lastSessionDays: 3,
    totalSessions: 12,
    nextSession: 'Today, 12:00',
    status: 'active',
    goal: 'Toning',
  },
  {
    id: 'c5',
    name: 'Noora Al-Naimi',
    lastSessionDays: 5,
    totalSessions: 2,
    nextSession: 'Today, 17:30',
    status: 'new',
    goal: 'Fitness basics',
  },
  {
    id: 'c6',
    name: 'Sara Al-Marri',
    lastSessionDays: 14,
    totalSessions: 9,
    status: 'attention',
    goal: 'Flexibility',
  },
  {
    id: 'c7',
    name: 'Reem Al-Dhaheri',
    lastSessionDays: 4,
    totalSessions: 21,
    nextSession: 'Wed, 14:00',
    status: 'active',
    goal: 'Strength',
  },
  {
    id: 'c8',
    name: 'Latifa Al-Mazrouei',
    lastSessionDays: 21,
    totalSessions: 6,
    status: 'attention',
    goal: 'Cardio',
  },
  {
    id: 'c9',
    name: 'Aisha Al-Mansoori',
    lastSessionDays: 0,
    totalSessions: 1,
    nextSession: 'Fri, 09:00',
    status: 'new',
    goal: 'Postnatal',
  },
  {
    id: 'c10',
    name: 'Khulood Al-Suwaidi',
    lastSessionDays: 2,
    totalSessions: 41,
    nextSession: 'Thu, 08:00',
    status: 'active',
    goal: 'Strength',
  },
];

type Filter = 'All' | 'Active' | 'New' | 'Attention';

const filterToStatus: Record<Filter, ClientStatus | 'all'> = {
  All: 'all',
  Active: 'active',
  New: 'new',
  Attention: 'attention',
};

const filterChips: Filter[] = ['All', 'Active', 'New', 'Attention'];

function getStatusBadge(status: ClientStatus): {
  label: string;
  variant: 'success' | 'info' | 'warning';
} {
  if (status === 'active') return { label: 'Active', variant: 'success' };
  if (status === 'new') return { label: 'New', variant: 'info' };
  return { label: 'Needs attention', variant: 'warning' };
}

function getLastSessionLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  return `${Math.floor(days / 7)} weeks ago`;
}

export default function TrainerClients() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  const counts = useMemo(() => {
    return {
      All: mockClients.length,
      Active: mockClients.filter((c) => c.status === 'active').length,
      New: mockClients.filter((c) => c.status === 'new').length,
      Attention: mockClients.filter((c) => c.status === 'attention').length,
    };
  }, []);

  const filtered = useMemo(() => {
    const target = filterToStatus[filter];
    const q = search.trim().toLowerCase();
    return mockClients.filter((c) => {
      const matchFilter = target === 'all' || c.status === target;
      const matchSearch =
        q.length === 0 ||
        c.name.toLowerCase().includes(q) ||
        c.goal.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [search, filter]);

  return (
    <Screen scroll padded={false}>
      <YStack paddingHorizontal="$4" paddingTop="$4" paddingBottom="$3">
        <Text variant="caption" color="muted">
          My roster
        </Text>
        <Text variant="h2">Clients</Text>
      </YStack>

      {/* Search */}
      <YStack paddingHorizontal="$4">
        <Input
          placeholder="Search by name or goal"
          value={search}
          onChangeText={setSearch}
          icon={<Search size={18} color="$textMuted" />}
          accessibilityLabel="Search clients"
        />
      </YStack>

      {/* Filter chips */}
      <YStack paddingHorizontal="$4" marginTop="$3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap="$2">
            {filterChips.map((f) => (
              <Chip
                key={f}
                label={`${f} (${counts[f]})`}
                selected={filter === f}
                onPress={() => setFilter(f)}
              />
            ))}
          </XStack>
        </ScrollView>
      </YStack>

      {/* Client list */}
      <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={48} color="$textMuted" />}
            title="No clients found"
            description={
              search
                ? `No results for "${search}"`
                : 'No clients match the selected filter'
            }
          />
        ) : (
          filtered.map((c) => {
            const statusInfo = getStatusBadge(c.status);
            return (
              <Card
                key={c.id}
                variant="outlined"
                padding="sm"
                onPress={() =>
                  router.push({
                    pathname: '/(trainer)/clients/[id]',
                    params: { id: c.id },
                  } as any)
                }
                accessibilityLabel={`${c.name}, ${statusInfo.label}, last session ${getLastSessionLabel(c.lastSessionDays)}`}
              >
                <XStack alignItems="center" gap="$3">
                  <Avatar name={c.name} size="lg" />
                  <YStack flex={1} gap="$1">
                    <XStack alignItems="center" gap="$2">
                      <Text variant="label" numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Badge
                        label={statusInfo.label}
                        variant={statusInfo.variant}
                        size="sm"
                      />
                    </XStack>
                    <Text variant="caption" color="muted">
                      {c.goal} • {c.totalSessions} sessions
                    </Text>
                    <XStack gap="$3" marginTop="$0.5">
                      <YStack>
                        <Text variant="caption" color="muted">
                          Last
                        </Text>
                        <Text variant="bodySmall" weight="500">
                          {getLastSessionLabel(c.lastSessionDays)}
                        </Text>
                      </YStack>
                      <YStack>
                        <Text variant="caption" color="muted">
                          Next
                        </Text>
                        <Text variant="bodySmall" weight="500" color="brand">
                          {c.nextSession ?? '—'}
                        </Text>
                      </YStack>
                    </XStack>
                  </YStack>
                  <ChevronRight size={20} color="$textMuted" />
                </XStack>
              </Card>
            );
          })
        )}
      </YStack>
    </Screen>
  );
}
