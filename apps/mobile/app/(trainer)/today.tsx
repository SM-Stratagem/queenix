import {
  formatTime,
  getTimeGreeting,
  getStatusVariant,
  getStatusLabel,
  deriveStatus,
  type SessionStatus,
} from '@/components/trainer-today/format';
import React, { useMemo } from 'react';
import { HeroStat, QuickAction, SessionRow } from '@/components/trainer-today/Cards';
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
