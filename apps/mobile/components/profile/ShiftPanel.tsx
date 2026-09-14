import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text, Button } from "@queenix/ui"
import { Clock, Play, StopCircle, ShieldCheck } from "@tamagui/lucide-icons"
import { formatElapsed, formatTime } from "./format"

export function ShiftPanel({
  active,
  elapsedSeconds,
  startedAt,
  onStart,
  onEnd,
  geofenceLabel = "Geofenced to Queenix Dubai Marina",
}: {
  active: boolean
  elapsedSeconds: number
  startedAt: number | null
  onStart: () => void
  onEnd: () => void
  geofenceLabel?: string
}) {
  return (
    <YStack paddingHorizontal="$4" marginTop="$4">
      <Text variant="h4" marginBottom="$2">Current shift</Text>
      <Card
        variant="elevated"
        padding="md"
        backgroundColor={active ? "$brand50" : "$surface"}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap="$0.5">
            <Text variant="caption" color="muted" textTransform="uppercase">
              {active ? "On shift" : "Off shift"}
            </Text>
            <Text variant="h2" color={active ? "brand" : "primary"}>
              {active ? formatElapsed(elapsedSeconds) : "Not started"}
            </Text>
            {active && startedAt && (
              <XStack alignItems="center" gap="$1.5">
                <Clock size={12} color="$brand" />
                <Text variant="caption" color="brand" weight="600">
                  Started at {formatTime(startedAt)}
                </Text>
              </XStack>
            )}
          </YStack>
          <YStack
            width={48}
            height={48}
            borderRadius="$full"
            alignItems="center"
            justifyContent="center"
            backgroundColor={active ? "$danger" : "$brand"}
            accessibilityLabel={active ? "Shift in progress" : "Shift not started"}
          >
            {active ? (
              <StopCircle size={24} color="$textOnBrand" />
            ) : (
              <Play size={24} color="$textOnBrand" />
            )}
          </YStack>
        </XStack>
        <YStack marginTop="$3">
          <Button
            label={active ? "End shift" : "Start shift"}
            variant="primary"
            size="lg"
            fullWidth
            onPress={active ? onEnd : onStart}
            accessibilityLabel={active ? "End current shift" : "Start a new shift"}
          />
        </YStack>
        <XStack alignItems="center" gap="$2" marginTop="$3">
          <ShieldCheck size={14} color="$success500" />
          <Text variant="caption" color="secondary">
            {geofenceLabel}
          </Text>
        </XStack>
      </Card>
    </YStack>
  )
}
