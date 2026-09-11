import type { ClassView, TrainerView } from "./types"
import React from "react"
import { XStack, YStack } from "tamagui"
import {
  Card,
  Text,
  Avatar,
  Badge,
  Button,
  Progress,
} from "@queenix/ui"
import {
  Clock,
  Users,
  ChevronRight,
  Star,
} from "@tamagui/lucide-icons"

export function TabPill({
  label,
  icon,
  active,
  onPress,
  flex,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  flex?: number;
}) {
  return (
    <XStack
      flex={flex}
      alignItems="center"
      justifyContent="center"
      gap="$2"
      paddingVertical="$3"
      borderRadius="$lg"
      backgroundColor={active ? '$brand' : '$surfaceMuted'}
      borderWidth={1}
      borderColor={active ? '$brand' : '$borderColor'}
      onPress={onPress}
      pressStyle={{ opacity: 0.85, scale: 0.98 }}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {icon}
      <Text variant="label" color={active ? 'inverse' : 'primary'}>
        {label}
      </Text>
    </XStack>
  );
}

export function ClassCard({
  cls,
  onPress,
  onBook,
  busy,
}: {
  cls: ClassView;
  onPress: () => void;
  onBook: () => void;
  busy: boolean;
}) {
  const fillPct = (cls.bookedCount / cls.capacity) * 100;
  const isFull = cls.bookedCount >= cls.capacity;

  return (
    <Card variant="elevated" padding="none" onPress={onPress} accessibilityLabel={`Open ${cls.name}`}>
      <YStack>
        {/* Hero image area */}
        <YStack
          height={120}
          backgroundColor={cls.hue as any}
          alignItems="center"
          justifyContent="center"
          borderTopLeftRadius="$xl"
          borderTopRightRadius="$xl"
        >
          {cls.icon}
          <Text variant="caption" color="secondary" marginTop="$2">
            {cls.room} • {cls.level}
          </Text>
        </YStack>

        <YStack padding="$4" gap="$3">
          <YStack gap="$1">
            <XStack alignItems="center" justifyContent="space-between" gap="$2">
              <Text variant="h4" flex={1}>{cls.name}</Text>
              <Badge label={cls.category} variant="brand" />
            </XStack>
            <XStack alignItems="center" gap="$3">
              <XStack alignItems="center" gap="$1">
                <Clock size={14} color="$textMuted" />
                <Text variant="caption" color="muted">
                  {formatDay(cls.startsAt)}, {formatHour(cls.startsAt)} • {cls.durationMin}m
                </Text>
              </XStack>
            </XStack>
            {cls.trainerName && (
              <Text variant="bodySmall" color="secondary">
                with {cls.trainerName}
              </Text>
            )}
          </YStack>

          {/* Capacity */}
          <YStack gap="$1">
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap="$1">
                <Users size={14} color="$textMuted" />
                <Text variant="caption" color="muted">
                  {cls.bookedCount}/{cls.capacity} booked
                </Text>
              </XStack>
              <Text
                variant="caption"
                color={isFull ? 'danger' : fillPct > 80 ? 'warning' : 'success'}
                weight="600"
              >
                {isFull ? 'Full' : fillPct > 80 ? 'Almost full' : 'Spots open'}
              </Text>
            </XStack>
            <Progress
              value={fillPct}
              size="sm"
              color={isFull ? '$danger' : fillPct > 80 ? '$warning' : '$brand'}
            />
          </YStack>

          <Button
            label={busy ? 'Booking…' : isFull ? 'Join waitlist' : 'Book class'}
            variant={isFull ? 'outline' : 'primary'}
            size="md"
            fullWidth
            disabled={busy}
            onPress={isFull ? onPress : onBook}
            iconRight={!isFull && !busy ? <ChevronRight size={16} color="$textOnBrand" /> : undefined}
          />
        </YStack>
      </YStack>
    </Card>
  );
}

export function TrainerCard({ trainer, onPress }: { trainer: TrainerView; onPress: () => void }) {
  return (
    <Card variant="outlined" padding="md" onPress={onPress} accessibilityLabel={`View ${trainer.name} profile`}>
      <XStack gap="$3" alignItems="flex-start">
        <Avatar name={trainer.name} size="lg" />
        <YStack flex={1} gap="$1">
          <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
            <Text variant="h4">{trainer.name}</Text>
            <XStack alignItems="center" gap="$1">
              <Star size={14} color="$warning500" fill="$warning500" />
              <Text variant="caption" weight="600">
                {trainer.rating.toFixed(1)}
              </Text>
              <Text variant="caption" color="muted">
                ({trainer.reviewCount})
              </Text>
            </XStack>
          </XStack>
          <Text variant="bodySmall" color="secondary">
            {trainer.specialty}
          </Text>
          {trainer.bio ? (
            <Text variant="bodySmall" color="muted" numberOfLines={2}>
              {trainer.bio}
            </Text>
          ) : null}
          <XStack alignItems="center" justifyContent="space-between" marginTop="$2">
            <YStack>
              <Text variant="caption" color="muted">From</Text>
              <Text variant="h4" color="brand">AED {trainer.hourlyRate}</Text>
              <Text variant="caption" color="muted">per hour</Text>
            </YStack>
            <Button label="Book" variant="primary" size="sm" onPress={onPress} />
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}
