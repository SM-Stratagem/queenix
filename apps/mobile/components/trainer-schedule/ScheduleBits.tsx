import React from "react"
import { XStack, YStack } from "tamagui"
import { Card, Text, Badge, Skeleton, EmptyState } from "@queenix/ui"
import type { GridSlot } from "./types"

const SLOT_COLOR: Record<string, { border: string }> = {
  PT: { border: "$brand" },
  Class: { border: "$success" },
  Blocked: { border: "$danger" },
  Free: { border: "$textMuted" },
}

const SLOT_LABEL: Record<string, string> = {
  PT: "Personal training",
  Class: "Group class",
  Blocked: "Blocked",
  Free: "Free slot",
}

export function StatChip({
  label,
  value,
  flex,
}: {
  label: string
  value: string
  flex?: number
}) {
  return (
    <Card flex={flex} variant="outlined" padding="sm">
      <YStack alignItems="center">
        <Text variant="h3">{value}</Text>
        <Text variant="caption" color="muted">
          {label}
        </Text>
      </YStack>
    </Card>
  )
}

export function ToggleButton({
  label,
  selected,
  onPress,
  flex,
}: {
  label: string
  selected: boolean
  onPress: () => void
  flex?: number
}) {
  return (
    <XStack
      flex={flex}
      backgroundColor={selected ? "$brand" : "transparent"}
      paddingVertical="$2"
      borderRadius="$md"
      alignItems="center"
      justifyContent="center"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
      accessibilityRole="button"
      accessibilityLabel={`${label} view`}
      accessibilityState={{ selected }}
    >
      <Text variant="label" color={selected ? "inverse" : "secondary"}>
        {label}
      </Text>
    </XStack>
  )
}

export function LegendDot({
  color,
  label,
}: {
  color: any
  label: string
}) {
  return (
    <XStack
      alignItems="center"
      gap="$1.5"
      backgroundColor="$surfaceMuted"
      paddingHorizontal="$2.5"
      paddingVertical="$1"
      borderRadius="$full"
    >
      <YStack width={8} height={8} borderRadius="$full" backgroundColor={color} />
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </XStack>
  )
}

export function DayView({
  slots,
  isLoading,
}: {
  slots: GridSlot[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
        <Skeleton height={80} borderRadius="$md" />
        <Skeleton height={80} borderRadius="$md" />
        <Skeleton height={80} borderRadius="$md" />
      </YStack>
    )
  }
  if (slots.length === 0) {
    return (
      <YStack paddingHorizontal="$4" marginTop="$4">
        <EmptyState
          title="No sessions on this day"
          message="Try another day or add availability."
        />
      </YStack>
    )
  }
  return (
    <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
      <Text variant="h4">Day plan</Text>
      {slots
        .sort((a, b) => a.hour - b.hour)
        .map((s, i) => (
          <Card key={i} variant="outlined" padding="sm">
            <XStack alignItems="center" gap="$3">
              <YStack width={56} alignItems="center">
                <Text variant="h4">{s.hour.toString().padStart(2, "0")}:00</Text>
              </YStack>
              <YStack
                width={3}
                alignSelf="stretch"
                backgroundColor={SLOT_COLOR[s.type]?.border as any}
                borderRadius="$full"
              />
              <YStack flex={1}>
                <Text variant="label">{s.title ?? SLOT_LABEL[s.type]}</Text>
                <Text variant="caption" color="muted">
                  {SLOT_LABEL[s.type]}
                </Text>
              </YStack>
              <Badge
                label={SLOT_LABEL[s.type]}
                variant={
                  s.type === "PT"
                    ? "brand"
                    : s.type === "Class"
                      ? "success"
                      : s.type === "Blocked"
                        ? "danger"
                        : "neutral"
                }
              />
            </XStack>
          </Card>
        ))}
    </YStack>
  )
}
