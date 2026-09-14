import React, { useState, useMemo } from 'react';
import { YStack, XStack, ScrollView, Progress as TProgress } from 'tamagui';
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
  ErrorState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';
import { Section, KeyValue, Stat as ClientStat } from '@/components/trainer-client/primitives';
import { getRelative } from '@/components/trainer-client/format';
import {
  ClientOverviewTab,
  ClientSessionsTab,
  ClientNotesTab,
} from '@/components/trainer-client/tabs';
import {
  MessageCircle,
  CalendarPlus,
  Target,
  Heart,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Send,
} from '@tamagui/lucide-icons';
import { Pressable } from 'react-native';

type Tab = 'overview' | 'sessions' | 'notes';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'notes', label: 'Notes' },
];

export default function TrainerClientDetail() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const memberId = (params.id as string) || '';
  const [tab, setTab] = useState<Tab>('overview');
  const [noteDraft, setNoteDraft] = useState('');

  const clientQuery = useConvexQuery(
    api.queries.users.getClientDetail,
    memberId ? ({ memberId: memberId as any } as any) : 'skip'
  );
  const isLoading = clientQuery === undefined;

  if (isLoading) {
    return (
      <Screen padded={false}>
        <Header showBack onBack={() => router.back()} title="Client" />
        <YStack padding="$4" gap="$3">
          <Skeleton height={120} />
          <Skeleton height={60} />
          <Skeleton height={60} />
          <Skeleton height={60} />
        </YStack>
      </Screen>
    );
  }

  if (!clientQuery || !clientQuery.member) {
    return (
      <Screen padded={false}>
        <Header showBack onBack={() => router.back()} title="Client" />
        <YStack padding="$4">
          <EmptyState
            title="Client not found"
            message="This client may have been removed or you may not have permission to view them."
          />
          <Button
            label="Back to roster"
            variant="outline"
            onPress={() => router.back()}
            marginTop="$3"
          />
        </YStack>
      </Screen>
    );
  }

  const { member, memberProfile, recentSessions, latestNotes } = clientQuery;
  const fullName = member.fullName ?? 'Client';

  const completedCount = recentSessions.filter((s: any) => s.status === 'completed').length;
  const upcoming = recentSessions.find(
    (s: any) => s.status === 'scheduled' && s.scheduledAt > Date.now()
  );
  const lastCompleted = [...recentSessions]
    .filter((s: any) => s.status === 'completed' || s.scheduledAt < Date.now())
    .sort((a: any, b: any) => b.scheduledAt - a.scheduledAt)[0];

  const lastSessionLabel = lastCompleted
    ? getRelative(lastCompleted.scheduledAt)
    : '—';
  const nextSessionLabel = upcoming
    ? getRelative(upcoming.scheduledAt)
    : '—';

  const handleSendNote = () => {
    if (noteDraft.trim().length === 0) {
      toast.show('Type a note first', 'warning');
      return;
    }
    toast.show('Note saved (locally — backend persistence coming soon)', 'success');
    setNoteDraft('');
  };

  return (
    <Screen padded={false}>
      <Header
        showBack
        onBack={() => router.back()}
        title="Client"
        right={
          <Pressable
            onPress={() => toast.show('Opening chat…', 'info')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Message client"
          >
            <MessageCircle size={22} color="$textPrimary" />
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
                  <Badge label="Active" variant="success" />
                </XStack>
                <Text variant="caption" color="muted">
                  Member since {new Date(member.createdAt).toLocaleDateString('en-GB', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </YStack>
            </XStack>
            <XStack gap="$2" marginTop="$3">
              <Button
                label="Book session"
                variant="primary"
                size="sm"
                icon={<CalendarPlus size={16} color="$textOnBrand" />}
                onPress={() => toast.show('Opening scheduler…', 'info')}
                accessibilityLabel="Book session"
                flex={1}
              />
              <Button
                label="Message"
                variant="outline"
                size="sm"
                icon={<MessageCircle size={16} color="$brand" />}
                onPress={() => toast.show('Opening chat…', 'info')}
                accessibilityLabel="Send message"
                flex={1}
              />
            </XStack>
          </Card>
        </YStack>

        {/* Quick stats */}
        <XStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <ClientStat label="Total sessions" value={recentSessions.length.toString()} flex={1} />
          <ClientStat label="Completed" value={completedCount.toString()} flex={1} />
          <ClientStat label="Last seen" value={lastSessionLabel} flex={1} />
        </XStack>
        <YStack paddingHorizontal="$4" marginTop="$2">
          <Card variant="outlined" padding="sm">
            <XStack alignItems="center" justifyContent="space-between" marginBottom="$2">
              <XStack alignItems="center" gap="$1.5">
                <Target size={14} color="$brand" />
                <Text variant="label">Engagement</Text>
              </XStack>
              <Text variant="bodySmall" weight="600" color="brand">
                {Math.min(100, Math.round((completedCount / Math.max(1, recentSessions.length)) * 100))}%
              </Text>
            </XStack>
            <TProgress
              value={Math.min(100, Math.round((completedCount / Math.max(1, recentSessions.length)) * 100))}
            />
            <Text variant="caption" color="muted" marginTop="$1.5">
              {nextSessionLabel !== '—' ? `Next session ${nextSessionLabel}` : 'No upcoming session scheduled'}
            </Text>
          </Card>
        </YStack>

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
          <ClientOverviewTab
            member={member}
            profile={memberProfile}
            bookingsThisMonth={recentSessions.filter((s: any) => s.status === 'completed').length}
            totalSpentLabel={`${recentSessions.length} sessions`}
            lastSessionLabel={lastSessionLabel}
          />
        )}

        {tab === 'sessions' && (
          <ClientSessionsTab sessions={recentSessions ?? []} />
        )}

        {tab === 'notes' && (
          <ClientNotesTab notes={latestNotes ?? []} onAdd={() => toast.info("Add note — coming soon")} />
        )}
      </ScrollView>
    </Screen>
  );
}

