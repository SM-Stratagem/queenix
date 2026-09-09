import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Card, Avatar, Button, Badge, Logo, Spacer, Progress } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import {
  Calendar,
  QrCode,
  Activity,
  Users,
  TrendingUp,
  Award,
  ChevronRight,
  Sparkles,
} from '@tamagui/lucide-icons';
import { formatDate, formatTime } from '@queenix/types';

export default function MemberHome() {
  const router = useRouter();
  const { session } = useAuth();

  // Mock data — in production: Convex queries
  const membership = {
    planName: 'Premium',
    status: 'active' as const,
    daysRemaining: 23,
    visitsThisMonth: 12,
    pointsBalance: 1240,
  };

  const nextClass = {
    name: 'Power Yoga',
    trainer: 'Maya Patel',
    startsAt: Date.now() + 2 * 60 * 60 * 1000,
    room: 'Studio 2',
  };

  const liveOccupancy = 38;
  const maxOccupancy = 60;

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
              <XStack justifyContent="space-between" alignItems="flex-start">
                <YStack>
                  <Text variant="caption" color="secondary" textTransform="uppercase">
                    {membership.planName} Membership
                  </Text>
                  <Text variant="h2" marginTop="$1">
                    {membership.daysRemaining} days
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    remaining on your plan
                  </Text>
                </YStack>
                <Badge label="Active" variant="success" />
              </XStack>
              <Progress value={(membership.daysRemaining / 30) * 100} size="sm" />
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
              <Badge label={`${liveOccupancy}/${maxOccupancy}`} variant={liveOccupancy > maxOccupancy * 0.8 ? 'warning' : 'success'} />
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
          <Card
            variant="elevated"
            onPress={() => router.push('/(member)/classes')}
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
                <Text variant="h4">{nextClass.name}</Text>
                <Text variant="bodySmall" color="secondary">
                  with {nextClass.trainer} • {nextClass.room}
                </Text>
                <Text variant="caption" color="brand" fontWeight="600">
                  Today, {formatTime(nextClass.startsAt)}
                </Text>
              </YStack>
              <ChevronRight size={20} color="$textMuted" />
            </XStack>
          </Card>
        </YStack>

        {/* Stats */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$3">This month</Text>
          <XStack gap="$3">
            <StatCard
              icon={<TrendingUp size={20} color="$brand" />}
              value={membership.visitsThisMonth.toString()}
              label="Visits"
              flex={1}
            />
            <StatCard
              icon={<Award size={20} color="$brand" />}
              value={membership.pointsBalance.toString()}
              label="Points"
              flex={1}
            />
            <StatCard
              icon={<Users size={20} color="$brand" />}
              value="5"
              label="Classes"
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
