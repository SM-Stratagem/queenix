import React, { useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Button,
  Badge,
  Logo,
  Spacer,
  Skeleton,
  EmptyState,
  ErrorState,
  useToast,
} from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';
import {
  Clock,
  Users,
  Calendar,
  Play,
  FileText,
  CalendarPlus,
  Ban,
  Plane,
  CheckCircle2,
} from '@tamagui/lucide-icons';

type SessionStatus = 'completed' | 'in-progress' | 'upcoming';

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getStatusVariant(status: SessionStatus): 'success' | 'brand' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'in-progress') return 'brand';
  return 'neutral';
}

function getStatusLabel(status: SessionStatus): string {
  if (status === 'completed') return 'Completed';
  if (status === 'in-progress') return 'In progress';
  return 'Upcoming';
}

function deriveStatus(scheduledAt: number, durationMinutes: number, dbStatus: string): SessionStatus {
  const now = Date.now();
  const end = scheduledAt + durationMinutes * 60 * 1000;
  if (dbStatus === 'completed' || end < now) return 'completed';
  if (dbStatus === 'no_show' || dbStatus === 'cancelled') return 'completed';
  if (scheduledAt <= now && now < end) return 'in-progress';
  return 'upcoming';
}

export default function TrainerToday() {
  const router = useRouter();
  const { session } = useAuth();
  const toast = useToast();

  const greeting = getTimeGreeting();
  const firstName = session?.fullName?.split(' ')[0] ?? 'Trainer';

  const sessionsQuery = useConvexQuery(api.queries.users.getTodaySessions, {});

  const isLoading = sessionsQuery === undefined;
  const sessions = sessionsQuery ?? [];

  const stats = useMemo(() => {
    const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const uniqueMembers = new Set(sessions.map((s) => s.memberId as unknown as string)).size;
    return {
      sessions: sessions.length,
      hours: totalMinutes / 60,
      uniqueMembers,
    };
  }, [sessions]);

  const handleQuickAction = (label: string) => {
    toast.info(`${label} — coming soon`);
  };

  return (
    <Screen scroll padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <XStack
          paddingTop="$4"
          paddingHorizontal="$4"
          paddingBottom="$3"
          alignItems="center"
          justifyContent="space-between"
        >
          <YStack>
            <Text variant="caption" color="muted">
              {greeting}
            </Text>
            <Text variant="h2">{firstName}</Text>
          </YStack>
          <Logo size="sm" />
        </XStack>

        {/* Hero stats */}
        <YStack paddingHorizontal="$4">
          <Card variant="elevated" padding="lg">
            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="flex-start">
                <YStack>
                  <Text variant="caption" color="secondary" textTransform="uppercase">
                    Today
                  </Text>
                  <Text variant="h3" marginTop="$1">
                    Your training day
                  </Text>
                </YStack>
                <Badge label="On shift" variant="success" />
              </XStack>
              <XStack gap="$3" marginTop="$2">
                {isLoading ? (
                  <>
                    <Skeleton flex={1} height={88} borderRadius="$md" />
                    <Skeleton flex={1} height={88} borderRadius="$md" />
                    <Skeleton flex={1} height={88} borderRadius="$md" />
                  </>
                ) : (
                  <>
                    <HeroStat
                      icon={<Calendar size={18} color="$brand" />}
                      value={stats.sessions.toString()}
                      label="Sessions"
                      flex={1}
                    />
                    <HeroStat
                      icon={<Clock size={18} color="$brand" />}
                      value={`${stats.hours.toFixed(1)}h`}
                      label="Hours booked"
                      flex={1}
                    />
                    <HeroStat
                      icon={<Users size={18} color="$brand" />}
                      value={stats.uniqueMembers.toString()}
                      label="Unique members"
                      flex={1}
                    />
                  </>
                )}
              </XStack>
            </YStack>
          </Card>
        </YStack>

        {/* Quick actions */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$3">
            Quick actions
          </Text>
          <XStack gap="$3">
            <QuickAction
              icon={<CalendarPlus size={20} color="$textOnBrand" />}
              label="Add availability"
              onPress={() => handleQuickAction('Add availability')}
              flex={1}
            />
            <QuickAction
              icon={<Ban size={20} color="$textOnBrand" />}
              label="Mark unavailable"
              onPress={() => handleQuickAction('Mark unavailable')}
              flex={1}
            />
            <QuickAction
              icon={<Plane size={20} color="$textOnBrand" />}
              label="Request day off"
              onPress={() => handleQuickAction('Request day off')}
              flex={1}
            />
          </XStack>
        </YStack>

        {/* Today's schedule */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text variant="h4">Today's schedule</Text>
            <Text
              variant="bodySmall"
              color="brand"
              onPress={() => router.push('/(trainer)/schedule')}
              accessibilityLabel="Open weekly schedule"
            >
              View week
            </Text>
          </XStack>
          {isLoading ? (
            <YStack gap="$2">
              <Skeleton height={88} borderRadius="$md" />
              <Skeleton height={88} borderRadius="$md" />
              <Skeleton height={88} borderRadius="$md" />
            </YStack>
          ) : sessions.length === 0 ? (
            <EmptyState
              title="No sessions today"
              message="Your schedule is clear. Use a quick action above to add availability or a session."
            />
          ) : (
            <YStack gap="$2">
              {sessions.map((s) => (
                <SessionRow
                  key={s._id}
                  scheduledAt={s.scheduledAt}
                  durationMinutes={s.durationMinutes}
                  memberName={s.member?.fullName ?? 'Member'}
                  memberId={s.memberId}
                  dbStatus={s.status}
                  onStart={() =>
                    toast.success(`Started PT with ${s.member?.fullName ?? 'member'}`)
                  }
                  onViewNotes={() =>
                    router.push(`/(trainer)/clients/${s.memberId}`)
                  }
                />
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function HeroStat({
  icon,
  value,
  label,
  flex,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  flex?: number;
}) {
  return (
    <YStack
      flex={flex}
      gap="$1"
      backgroundColor="$surfaceMuted"
      padding="$3"
      borderRadius="$md"
    >
      <XStack>{icon}</XStack>
      <Text variant="h3">{value}</Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </YStack>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  flex,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  flex?: number;
}) {
  return (
    <YStack
      flex={flex}
      alignItems="center"
      gap="$2"
      onPress={onPress}
      pressStyle={{ opacity: 0.7, scale: 0.97 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <YStack
        backgroundColor="$brand"
        padding="$3"
        borderRadius="$xl"
        alignItems="center"
        justifyContent="center"
        width={56}
        height={56}
      >
        {icon}
      </YStack>
      <Text variant="caption" weight="600" align="center">
        {label}
      </Text>
    </YStack>
  );
}

function SessionRow({
  scheduledAt,
  durationMinutes,
  memberName,
  memberId,
  dbStatus,
  onStart,
  onViewNotes,
}: {
  scheduledAt: number;
  durationMinutes: number;
  memberName: string;
  memberId: string;
  dbStatus: string;
  onStart: () => void;
  onViewNotes: () => void;
}) {
  const status = deriveStatus(scheduledAt, durationMinutes, dbStatus);
  const variant = getStatusVariant(status);
  const statusLabel = getStatusLabel(status);
  const startTime = formatTime(scheduledAt);
  const endTime = formatTime(scheduledAt + durationMinutes * 60 * 1000);

  return (
    <Card
      variant="outlined"
      padding="sm"
      onPress={status === 'upcoming' || status === 'in-progress' ? onStart : onViewNotes}
      accessibilityLabel={`PT with ${memberName} at ${startTime}, ${statusLabel}`}
    >
      <XStack alignItems="center" gap="$3">
        <YStack alignItems="center" width={56} gap="$0.5">
          <Text variant="h4" color={status === 'completed' ? 'muted' : 'primary'}>
            {startTime}
          </Text>
          <Text variant="caption" color="muted">
            {durationMinutes}m
          </Text>
        </YStack>
        <YStack
          width={3}
          alignSelf="stretch"
          backgroundColor="$brand"
          borderRadius="$full"
        />
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2">
            <Text
              variant="label"
              textDecorationLine={status === 'completed' ? 'line-through' : 'none'}
            >
              {memberName}
            </Text>
            <Badge label="PT" variant="brand" size="sm" />
          </XStack>
          <Text variant="caption" color="muted">
            {startTime}–{endTime}
          </Text>
          <XStack marginTop="$1">
            <Badge label={statusLabel} variant={variant} size="sm" />
          </XStack>
        </YStack>
        <YStack>
          {status === 'upcoming' ? (
            <Button
              label="Start"
              size="sm"
              variant="primary"
              onPress={onStart}
              icon={<Play size={14} color="$textOnBrand" />}
            />
          ) : status === 'in-progress' ? (
            <Button label="Resume" size="sm" variant="primary" onPress={onStart} />
          ) : (
            <XStack
              onPress={onViewNotes}
              pressStyle={{ opacity: 0.6 }}
              accessibilityRole="button"
              accessibilityLabel="View client detail"
              padding="$2"
            >
              <FileText size={20} color="$textMuted" />
            </XStack>
          )}
        </YStack>
      </XStack>
    </Card>
  );
}
