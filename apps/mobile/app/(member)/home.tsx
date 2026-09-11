import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Button,
  Badge,
  Logo,
  Progress,
  Skeleton,
  EmptyState,
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
  Sparkles,
} from '@tamagui/lucide-icons';
import { formatDate, formatTime } from '@queenix/types';

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

        {/* Hero membership card */}
        <YStack paddingHorizontal="$4">
          <Card variant="elevated" padding="lg">
            <YStack gap="$3">
              {isLoading ? (
                <YStack gap="$2">
                  <Skeleton width="40%" height={14} />
                  <Skeleton width="60%" height={28} />
                  <Skeleton width="80%" height={8} borderRadius={4} />
                </YStack>
              ) : membership ? (
                <>
                  <XStack justifyContent="space-between" alignItems="flex-start">
                    <YStack>
                      <Text variant="caption" color="secondary" textTransform="uppercase">
                        {membership.plan?.name ?? 'Membership'} Membership
                      </Text>
                      <Text variant="h2" marginTop="$1">
                        {daysRemaining} days
                      </Text>
                      <Text variant="bodySmall" color="secondary">
                        remaining on your plan
                      </Text>
                    </YStack>
                    <Badge label={membership.status} variant="success" />
                  </XStack>
                  <Progress value={progressPct} size="sm" />
                </>
              ) : (
                <YStack gap="$2">
                  <Text variant="label">No active membership</Text>
                  <Text variant="bodySmall" color="secondary">
                    Pick a plan to start training
                  </Text>
                </YStack>
              )}
              <XStack gap="$2" marginTop="$2">
                <Button
                  label="View membership"
                  variant="outline"
                  size="sm"
                  onPress={() => router.push('/(member)/profile')}
                />
                <Button
                  label="Renew"
                  variant="primary"
                  size="sm"
                  onPress={() => router.push('/(member)/payments')}
                />
              </XStack>
            </YStack>
          </Card>
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
          <Card variant="outlined">
            <XStack alignItems="center" justifyContent="space-between" marginBottom="$2">
              <YStack>
                <Text variant="label">Live occupancy</Text>
                <Text variant="bodySmall" color="muted">Updated just now</Text>
              </YStack>
              <Badge
                label={`${liveOccupancy}/${maxOccupancy}`}
                variant={liveOccupancy > maxOccupancy * 0.8 ? 'warning' : 'success'}
              />
            </XStack>
            <Progress
              value={(liveOccupancy / maxOccupancy) * 100}
              color={liveOccupancy > maxOccupancy * 0.8 ? '$warning' : '$brand'}
            />
            <Text variant="caption" color="muted" marginTop="$2">
              {liveOccupancy < maxOccupancy * 0.6
                ? 'Plenty of space — perfect time to train'
                : 'Getting busy — consider a quieter time slot'}
            </Text>
          </Card>
        </YStack>

        {/* Next booking */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text variant="h4">Up next</Text>
            <Text variant="bodySmall" color="brand" onPress={() => router.push('/(member)/book')}>
              See all
            </Text>
          </XStack>
          {isLoading ? (
            <Card variant="elevated">
              <XStack alignItems="center" gap="$3">
                <Skeleton width={56} height={56} borderRadius={16} />
                <YStack flex={1} gap="$1">
                  <Skeleton width="60%" height={18} />
                  <Skeleton width="40%" height={12} />
                  <Skeleton width="30%" height={12} />
                </YStack>
              </XStack>
            </Card>
          ) : nextClass ? (
            <Card
              variant="elevated"
              onPress={() => router.push(`/(member)/classes/${nextClass._id}`)}
              accessibilityLabel="Open next class"
            >
              <XStack alignItems="center" gap="$3">
                <YStack
                  backgroundColor="$brand50"
                  padding="$3"
                  borderRadius="$lg"
                  alignItems="center"
                  justifyContent="center"
                  width={56}
                  height={56}
                >
                  <Sparkles size={24} color="$brand" />
                </YStack>
                <YStack flex={1} gap="$1">
                  <Text variant="h4">Class at {formatTime(nextClass.startsAt)}</Text>
                  <Text variant="bodySmall" color="secondary">
                    {formatDate(nextClass.startsAt)} • {nextClass.roomId ?? 'Studio'}
                  </Text>
                  <Text variant="caption" color="brand" fontWeight="600">
                    {nextClass.bookedCount}/{nextClass.capacity} booked
                  </Text>
                </YStack>
                <ChevronRight size={20} color="$textMuted" />
              </XStack>
            </Card>
          ) : (
            <Card variant="outlined">
              <EmptyState
                title="No upcoming classes"
                message="Browse the schedule and book your next session."
                actionLabel="Browse classes"
                onAction={() => router.push('/(member)/book')}
              />
            </Card>
          )}
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
      <Text variant="caption" weight="600">{label}</Text>
    </YStack>
  );
}

function StatCard({
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
    <Card variant="outlined" padding="sm" flex={flex}>
      <YStack gap="$1">
        {icon}
        <Text variant="h3">{value}</Text>
        <Text variant="caption" color="muted">{label}</Text>
      </YStack>
    </Card>
  );
}
