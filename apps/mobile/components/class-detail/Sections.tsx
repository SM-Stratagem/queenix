import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Text, Card, Avatar, Badge, Progress, EmptyState } from '@queenix/ui';
import { Calendar, Clock, MapPin, Award } from '@tamagui/lucide-icons-2';
import { formatDay, formatHour } from './format';

export type CategoryIcon = React.ComponentType<{ size?: number | string; color?: string }>;

export function ClassHero({
  hue,
  iconColor,
  Icon,
  cat,
}: {
  hue: string;
  iconColor: string;
  Icon: CategoryIcon;
  cat: string;
}) {
  return (
    <YStack
      height={240}
      backgroundColor={hue as any}
      alignItems="center"
      justifyContent="center"
      paddingTop="$6"
    >
      <YStack
        backgroundColor="$surface"
        padding="$4"
        borderRadius="$xl"
        marginBottom="$3"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <Icon size={48} color={iconColor as any} />
      </YStack>
      <Badge label={cat} variant="brand" />
    </YStack>
  );
}

export function QuickInfoCard({
  startsAt,
  durationMinutes,
  roomId,
}: {
  startsAt: number;
  durationMinutes: number | undefined;
  roomId: string | undefined;
}) {
  return (
    <YStack paddingHorizontal="$4" marginTop="$4">
      <Card variant="outlined" padding="md">
        <XStack gap="$3" flexWrap="wrap">
          <InfoItem
            icon={<Calendar size={18} color="$brand" />}
            label={formatDay(startsAt)}
            sub={formatHour(startsAt)}
          />
          <InfoItem
            icon={<Clock size={18} color="$brand" />}
            label={`${durationMinutes ?? 60} min`}
            sub="Duration"
          />
          <InfoItem
            icon={<MapPin size={18} color="$brand" />}
            label={roomId ?? 'Studio'}
            sub="Location"
          />
        </XStack>
      </Card>
    </YStack>
  );
}

export function CapacityCard({
  bookedCount,
  capacity,
  fillPct,
  isFull,
}: {
  bookedCount: number;
  capacity: number;
  fillPct: number;
  isFull: boolean;
}) {
  return (
    <YStack paddingHorizontal="$4" marginTop="$3">
      <Card variant="outlined" padding="md">
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
          <YStack>
            <Text variant="label">Capacity</Text>
            <Text variant="caption" color="muted">
              {bookedCount} of {capacity} booked
            </Text>
          </YStack>
          <Text
            variant="caption"
            weight="600"
            color={isFull ? 'danger' : fillPct > 80 ? 'warning' : 'success'}
          >
            {isFull ? 'Full' : `${capacity - bookedCount} spots left`}
          </Text>
        </XStack>
        <Progress
          value={fillPct}
          size="md"
          color={isFull ? '$danger' : fillPct > 80 ? '$warning' : '$brand'}
        />
      </Card>
    </YStack>
  );
}

export function TrainerSection({
  trainerName,
  onPress,
}: {
  trainerName: string | undefined;
  onPress: () => void;
}) {
  return (
    <>
      {trainerName && (
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <Text variant="h3">About the trainer</Text>
          <Card
            variant="outlined"
            padding="md"
            onPress={onPress}
            accessibilityLabel={`View ${trainerName} profile`}
          >
            <XStack gap="$3" alignItems="flex-start">
              <Avatar name={trainerName} size="lg" />
              <YStack flex={1} gap="$1">
                <XStack alignItems="center" justifyContent="space-between" gap="$2">
                  <Text variant="h4">{trainerName}</Text>
                  <XStack alignItems="center" gap="$1">
                    <Award size={14} color="$brand" />
                    <Text variant="caption" color="brand" weight="600">
                      Coach
                    </Text>
                  </XStack>
                </XStack>
                <Text variant="caption" color="muted">Certified instructor</Text>
              </YStack>
            </XStack>
          </Card>
        </YStack>
      )}

      {!trainerName && (
        <YStack paddingHorizontal="$4" marginTop="$4">
          <EmptyState
            title="Trainer TBA"
            message="Your coach for this session will be announced soon."
          />
        </YStack>
      )}
    </>
  );
}

function InfoItem({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <XStack flex={1} minWidth={88} alignItems="center" gap="$2">
      <YStack backgroundColor="$brand50" padding="$2" borderRadius="$md">
        {icon}
      </YStack>
      <YStack flex={1}>
        <Text variant="label" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="caption" color="muted">
          {sub}
        </Text>
      </YStack>
    </XStack>
  );
}
