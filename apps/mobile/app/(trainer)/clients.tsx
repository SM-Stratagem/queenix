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
  Skeleton,
  EmptyState,
  ErrorState,
} from '@queenix/ui';
import { useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';
import { Search, ChevronRight, Users } from '@tamagui/lucide-icons';

type ClientStatus = 'active' | 'new' | 'attention';

type Filter = 'All' | 'Active' | 'New' | 'Attention';
const filterChips: Filter[] = ['All', 'Active', 'New', 'Attention'];

const filterToStatus: Record<Filter, ClientStatus | 'all'> = {
  All: 'all',
  Active: 'active',
  New: 'new',
  Attention: 'attention',
};

function getStatusBadge(status: ClientStatus): {
  label: string;
  variant: 'success' | 'info' | 'warning';
} {
  if (status === 'active') return { label: 'Active', variant: 'success' };
  if (status === 'new') return { label: 'New', variant: 'info' };
  return { label: 'Needs attention', variant: 'warning' };
}

function getLastSessionLabel(ts: number | null | undefined): string {
  if (!ts) return 'Never';
  const days = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  return `${Math.floor(days / 7)} weeks ago`;
}

function getNextSessionLabel(ts: number | null | undefined): string {
  if (!ts) return '—';
  const diff = ts - Date.now();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const d = new Date(ts);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (days < 0) return 'Overdue';
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Tomorrow, ${time}`;
  if (days < 7) {
    return `${d.toLocaleDateString('en-GB', { weekday: 'short' })}, ${time}`;
  }
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function deriveStatus(
  last: number | null,
  next: number | null,
  sessionCount: number
): ClientStatus {
  if (sessionCount <= 1) return 'new';
  if (last == null) return 'attention';
  const daysSince = (Date.now() - last) / (24 * 60 * 60 * 1000);
  if (daysSince > 14) return 'attention';
  return 'active';
}

export default function TrainerClients() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  const clientsQuery = useConvexQuery(api.queries.users.getMyClients, {});
  const isLoading = clientsQuery === undefined;
  const clients = clientsQuery ?? [];

  const enriched = useMemo(() => {
    return clients.map((c) => ({
      id: (c.member?._id as unknown as string) ?? '',
      name: c.member?.fullName ?? 'Member',
      goal: '',
      lastSessionDays: c.lastSessionAt,
      nextSessionAt: c.nextSessionAt,
      totalSessions: c.sessionCount,
      status: deriveStatus(c.lastSessionAt, c.nextSessionAt, c.sessionCount),
    }));
  }, [clients]);

  const counts = useMemo(() => {
    return {
      All: enriched.length,
      Active: enriched.filter((c) => c.status === 'active').length,
      New: enriched.filter((c) => c.status === 'new').length,
      Attention: enriched.filter((c) => c.status === 'attention').length,
    };
  }, [enriched]);

  const filtered = useMemo(() => {
    const target = filterToStatus[filter];
    const q = search.trim().toLowerCase();
    return enriched.filter((c) => {
      const matchFilter = target === 'all' || c.status === target;
      const matchSearch = q.length === 0 || c.name.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [search, filter, enriched]);

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
          placeholder="Search by name"
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={18} color="$textMuted" />}
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
                label={`${f} (${counts[f as keyof typeof counts]})`}
                selected={filter === f}
                onPress={() => setFilter(f)}
              />
            ))}
          </XStack>
        </ScrollView>
      </YStack>

      {/* Client list */}
      <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
        {isLoading ? (
          <>
            <Skeleton height={92} borderRadius="$md" />
            <Skeleton height={92} borderRadius="$md" />
            <Skeleton height={92} borderRadius="$md" />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={48} color="$textMuted" />}
            title="No clients found"
            description={
              search
                ? `No results for "${search}"`
                : clients.length === 0
                  ? 'Your client roster is empty — book your first PT session to start.'
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
                      {c.totalSessions} sessions
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
                          {getNextSessionLabel(c.nextSessionAt)}
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
