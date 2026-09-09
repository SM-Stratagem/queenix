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
          <Skeleton height={120} borderRadius="$lg" />
          <Skeleton height={60} borderRadius="$md" />
          <Skeleton height={60} borderRadius="$md" />
          <Skeleton height={60} borderRadius="$md" />
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
          <Stat label="Total sessions" value={recentSessions.length.toString()} flex={1} />
          <Stat label="Completed" value={completedCount.toString()} flex={1} />
          <Stat label="Last seen" value={lastSessionLabel} flex={1} />
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
          <YStack paddingHorizontal="$4" gap="$3">
            <Section title="About">
              <Text variant="bodySmall" color="secondary">
                {memberProfile?.preferences?.language
                  ? `Preferred language: ${memberProfile.preferences.language.toUpperCase()}. `
                  : ''}
                Joined {new Date(member.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}.
              </Text>
            </Section>

            <Section title="Contact">
              <KeyValue icon={<Mail size={16} color="$textSecondary" />} label="Email" value={member.email} />
              {member.phone && (
                <>
                  <Divider />
                  <KeyValue icon={<Phone size={16} color="$textSecondary" />} label="Phone" value={member.phone} />
                </>
              )}
              <Divider />
              <KeyValue
                icon={<Calendar size={16} color="$textSecondary" />}
                label="Member since"
                value={new Date(member.createdAt).toLocaleDateString('en-GB')}
              />
            </Section>

            {memberProfile?.emergencyContact && (
              <Section title="Emergency contact">
                <KeyValue
                  icon={<Heart size={16} color="$danger500" />}
                  label={memberProfile.emergencyContact.relationship ?? 'Contact'}
                  value={`${memberProfile.emergencyContact.name} • ${memberProfile.emergencyContact.phone}`}
                />
              </Section>
            )}

            {memberProfile?.vehicles && memberProfile.vehicles.length > 0 && (
              <Section title="Registered vehicles">
                <YStack gap="$1.5">
                  {memberProfile.vehicles.map((v, i) => (
                    <XStack key={i} alignItems="center" gap="$2">
                      <Text variant="bodySmall" color="secondary" flex={1}>
                        {v.color ? `${v.color} ` : ''}
                        {v.make ? `${v.make} ` : ''}
                        {v.model ?? ''}
                      </Text>
                      <Badge label={v.plate} variant="neutral" size="sm" />
                    </XStack>
                  ))}
                </YStack>
              </Section>
            )}
          </YStack>
        )}

        {tab === 'sessions' && (
          <YStack paddingHorizontal="$4" gap="$2">
            <Text variant="h4">Recent sessions</Text>
            {recentSessions.length === 0 ? (
              <EmptyState
                title="No sessions yet"
                message="Book a session to get started with this client."
              />
            ) : (
              recentSessions.map((s: any) => {
                const isUpcoming = s.status === 'scheduled' && s.scheduledAt > Date.now();
                const isCompleted = s.status === 'completed' || s.scheduledAt < Date.now();
                return (
                  <Card key={s._id} variant="outlined" padding="sm">
                    <XStack alignItems="flex-start" gap="$3">
                      <YStack
                        backgroundColor={isUpcoming ? '$brand' : '$surfaceMuted'}
                        padding="$2"
                        borderRadius="$md"
                        width={40}
                        height={40}
                        alignItems="center"
                        justifyContent="center"
                      >
                        {isUpcoming ? (
                          <Clock size={18} color="$textOnBrand" />
                        ) : (
                          <CheckCircle2 size={18} color="$success500" />
                        )}
                      </YStack>
                      <YStack flex={1} gap="$1">
                        <XStack justifyContent="space-between" alignItems="center">
                          <Text variant="bodySmall" weight="600">
                            {isUpcoming ? 'Upcoming session' : 'Completed session'}
                          </Text>
                          <Badge
                            label={isUpcoming ? 'Upcoming' : isCompleted ? 'Completed' : s.status}
                            variant={isUpcoming ? 'brand' : 'success'}
                            size="sm"
                          />
                        </XStack>
                        <Text variant="caption" color="muted">
                          {new Date(s.scheduledAt).toLocaleString('en-GB', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {` • ${s.durationMinutes}m`}
                        </Text>
                        {s.notes && (
                          <Text variant="caption" color="secondary" marginTop="$0.5">
                            "{s.notes}"
                          </Text>
                        )}
                      </YStack>
                    </XStack>
                  </Card>
                );
              })
            )}
          </YStack>
        )}

        {tab === 'notes' && (
          <YStack paddingHorizontal="$4" gap="$3">
            <Card variant="outlined" padding="sm">
              <YStack gap="$2">
                <Text variant="label">Quick note</Text>
                <YStack
                  backgroundColor="$surfaceMuted"
                  borderRadius="$md"
                  padding="$3"
                  borderWidth={1}
                  borderColor="$borderColor"
                  minHeight={64}
                >
                  <Text variant="bodySmall" color="secondary" numberOfLines={3}>
                    {noteDraft || `Type a trainer-only note for ${fullName.split(' ')[0]}…`}
                  </Text>
                </YStack>
                <XStack gap="$2" alignItems="center">
                  <Button
                    label="Save"
                    size="sm"
                    variant="primary"
                    icon={<Send size={14} color="$textOnBrand" />}
                    onPress={handleSendNote}
                    accessibilityLabel="Save note"
                  />
                </XStack>
                <XStack gap="$2" flexWrap="wrap">
                  {['Hit PR', 'Skipped', 'Form fix', 'Travel week'].map((tag) => (
                    <Chip
                      key={tag}
                      label={`+ ${tag}`}
                      selected={false}
                      onPress={() => setNoteDraft((d) => `${d}${d ? ' • ' : ''}${tag}`)}
                    />
                  ))}
                </XStack>
              </YStack>
            </Card>

            <Text variant="h4">Recent notes</Text>
            {latestNotes.length === 0 ? (
              <EmptyState
                icon={<FileText size={32} color="$textMuted" />}
                title="No notes yet"
                message="Add the first trainer note for this client."
              />
            ) : (
              latestNotes.map((n: any) => (
                <Card key={n._id} variant="outlined" padding="sm">
                  <XStack alignItems="flex-start" gap="$2">
                    <FileText size={16} color="$textMuted" />
                    <YStack flex={1} gap="$0.5">
                      <Text variant="caption" color="muted">
                        {getRelative(n.createdAt)}
                      </Text>
                      <Text variant="bodySmall" color="secondary">
                        {n.note}
                      </Text>
                    </YStack>
                  </XStack>
                </Card>
              ))
            )}
          </YStack>
        )}
      </ScrollView>
    </Screen>
  );
}

function getRelative(ts: number): string {
  const diff = Date.now() - ts;
  const abs = Math.abs(diff);
  const future = diff < 0;
  const minutes = Math.floor(abs / (60 * 1000));
  const hours = Math.floor(abs / (60 * 60 * 1000));
  const days = Math.floor(abs / (24 * 60 * 60 * 1000));

  if (minutes < 1) return future ? 'in a moment' : 'just now';
  if (minutes < 60) return future ? `in ${minutes}m` : `${minutes}m ago`;
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`;
  if (days === 1) return future ? 'tomorrow' : 'yesterday';
  if (days < 7) return future ? `in ${days} days` : `${days} days ago`;
  if (days < 14) return future ? 'in 1 week' : '1 week ago';
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <YStack gap="$2">
      <Text variant="h4">{title}</Text>
      <Card variant="outlined" padding="sm">
        <YStack>{children}</YStack>
      </Card>
    </YStack>
  );
}

function KeyValue({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <XStack alignItems="center" gap="$2" paddingVertical="$2.5">
      {icon}
      <Text variant="bodySmall" color="secondary" flex={1}>
        {label}
      </Text>
      <Text variant="bodySmall" weight="500" textAlign="right" flex={1.5} numberOfLines={1}>
        {value}
      </Text>
    </XStack>
  );
}

function Stat({ label, value, flex }: { label: string; value: string; flex?: number }) {
  return (
    <Card variant="outlined" padding="sm" flex={flex}>
      <YStack gap="$0.5">
        <Text variant="caption" color="muted">
          {label}
        </Text>
        <Text variant="bodySmall" weight="600">
          {value}
        </Text>
      </YStack>
    </Card>
  );
}
