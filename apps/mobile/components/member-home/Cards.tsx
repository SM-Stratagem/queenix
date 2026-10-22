import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Text, Card, Button, Badge, Progress, Skeleton, EmptyState } from '@queenix/ui';
import { ChevronRight, Sparkles } from '@tamagui/lucide-icons-2';
import { formatDate, formatTime } from '@queenix/types';

export function MembershipHeroCard({
  isLoading,
  membership,
  daysRemaining,
  progressPct,
  onViewMembership,
  onRenew,
}: {
  isLoading: boolean;
  membership: { status: string; plan?: { name?: string } | null } | null | undefined;
  daysRemaining: number;
  progressPct: number;
  onViewMembership: () => void;
  onRenew: () => void;
}) {
  return (
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
            onPress={onViewMembership}
          />
          <Button
            label="Renew"
            variant="primary"
            size="sm"
            onPress={onRenew}
          />
        </XStack>
      </YStack>
    </Card>
  );
}

export function OccupancyCard({
  liveOccupancy,
  maxOccupancy,
}: {
  liveOccupancy: number;
  maxOccupancy: number;
}) {
  return (
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
  );
}

export function NextClassCard({
  isLoading,
  nextClass,
  onOpenClass,
  onBrowse,
}: {
  isLoading: boolean;
  nextClass: { startsAt: number; roomId?: string; bookedCount: number; capacity: number } | null;
  onOpenClass: () => void;
  onBrowse: () => void;
}) {
  return (
    isLoading ? (
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
        onPress={onOpenClass}
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
          onAction={onBrowse}
        />
      </Card>
    )
  );
}

export function QuickAction({
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
      role="button"
      aria-label={label}
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

export function StatCard({
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
