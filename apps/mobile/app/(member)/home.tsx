import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Logo,
} from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';
import {
  QrCode,
  Activity,
  Users,
  TrendingUp,
  Award,
  Calendar,
  ChevronRight,
} from '@tamagui/lucide-icons-2';
import {
  MembershipHeroCard,
  OccupancyCard,
  NextClassCard,
  QuickAction,
  StatCard,
} from '@/components/member-home/Cards';

export default function MemberHome() {
  const router = useRouter();
  const { session } = useAuth();

  // Real data from Convex
  const membership = useConvexQuery(api.queries.memberships.getCurrentMembership, {});
  const upcomingClasses = useConvexQuery(api.queries.classes.getUpcomingClasses, { limit: 3 });
  const occupancy = useConvexQuery(api.queries.access.getCurrentOccupancy, {});
  const loyalty = useConvexQuery(api.queries.users.getLoyaltyBalance, {});

  const liveOccupancy = occupancy?.count ?? 0;
  // We don't have a per-gym capacity from the snapshot table; pick a reasonable default
  // and surface the raw count from the snapshot.
  const maxOccupancy = 60;
  const pointsBalance = loyalty?.balance ?? 0;

  const nextClass = upcomingClasses?.[0] ?? null;

  const isLoading =
    membership === undefined ||
    upcomingClasses === undefined ||
    occupancy === undefined ||
    loyalty === undefined;

  // Build "days remaining" off the membership endDate
  const daysRemaining = membership?.endDate
    ? Math.max(0, Math.ceil((membership.endDate - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;
  const totalDays = membership?.plan?.durationDays ?? 30;
  const progressPct = membership ? Math.min(100, (daysRemaining / Math.max(1, totalDays)) * 100) : 0;

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
            <Text variant="caption" color="muted">Good morning</Text>
            <Text variant="h2">{session?.fullName?.split(' ')[0] ?? 'Member'}</Text>
          </YStack>
          <Logo size="sm" />
        </XStack>

        {session && !session.emailVerified && (
          <YStack paddingHorizontal="$4" marginBottom="$2">
            <Card variant="outlined" padding="md" onPress={() => router.push('/(member)/security')} accessibilityLabel="Verify your email">
              <Text variant="label">Verify your email</Text>
              <Text variant="caption" color="secondary">
                We sent a 6-digit code to {session.email}. Tap to enter it.
              </Text>
            </Card>
          </YStack>
        )}

        {/* Hero membership card */}
        <YStack paddingHorizontal="$4">
          <MembershipHeroCard
            isLoading={isLoading}
            membership={membership}
            daysRemaining={daysRemaining}
            progressPct={progressPct}
            onViewMembership={() => router.push('/(member)/profile')}
            onRenew={() => router.push('/(member)/payments')}
          />
        </YStack>

        {/* Quick actions */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$3">Quick actions</Text>
          <XStack gap="$3">
            <QuickAction
              icon={<QrCode size={22} color="$textOnBrand" />}
              label="My QR"
              onPress={() => router.push('/(member)/gym')}
              flex={1}
            />
            <QuickAction
              icon={<Calendar size={22} color="$textOnBrand" />}
              label="Book class"
              onPress={() => router.push('/(member)/book')}
              flex={1}
            />
            <QuickAction
              icon={<Activity size={22} color="$textOnBrand" />}
              label="Trainer"
              onPress={() => router.push('/(member)/trainers')}
              flex={1}
            />
          </XStack>
        </YStack>

        {/* Live occupancy */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <OccupancyCard liveOccupancy={liveOccupancy} maxOccupancy={maxOccupancy} />
        </YStack>

        {/* Next booking */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text variant="h4">Up next</Text>
            <Text variant="bodySmall" color="brand" onPress={() => router.push('/(member)/book')}>
              See all
            </Text>
          </XStack>
          <NextClassCard
            isLoading={isLoading}
            nextClass={nextClass}
            onOpenClass={() => nextClass && router.push(`/(member)/classes/${nextClass._id}`)}
            onBrowse={() => router.push('/(member)/book')}
          />
        </YStack>

        {/* Stats */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$3">This month</Text>
          <XStack gap="$3">
            <StatCard
              icon={<TrendingUp size={20} color="$brand" />}
              value={isLoading ? '—' : String(pointsBalance)}
              label="Points"
              flex={1}
            />
            <StatCard
              icon={<Award size={20} color="$brand" />}
              value={isLoading ? '—' : String(nextClass ? upcomingClasses?.length ?? 0 : 0)}
              label="Upcoming"
              flex={1}
            />
            <StatCard
              icon={<Users size={20} color="$brand" />}
              value={isLoading ? '—' : `${liveOccupancy}`}
              label="In-gym"
              flex={1}
            />
          </XStack>
        </YStack>

        {/* Offers */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card
            variant="filled"
            backgroundColor="$brand50"
            onPress={() => router.push('/(member)/rewards')}
          >
            <XStack alignItems="center" gap="$3">
              <Award size={32} color="$brand" />
              <YStack flex={1}>
                <Text variant="label" color="brand">Refer a friend</Text>
                <Text variant="bodySmall" color="secondary">
                  Earn 500 points when they join
                </Text>
              </YStack>
              <ChevronRight size={20} color="$brand" />
            </XStack>
          </Card>
        </YStack>
      </ScrollView>
    </Screen>
  );
}
