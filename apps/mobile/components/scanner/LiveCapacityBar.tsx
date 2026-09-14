import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text, Badge } from "@queenix/ui"

export function LiveCapacityBar({
  liveCount,
  maxCapacity,
}: {
  liveCount: number
  maxCapacity: number
}) {
  const ratio = maxCapacity > 0 ? Math.min(1, liveCount / maxCapacity) : 0
  const isBusy = ratio > 0.8
  return (
    <YStack paddingHorizontal="$4" marginTop="$3">
      <Card variant="outlined" padding="sm">
        <XStack alignItems="center" justifyContent="space-between" marginBottom="$2">
          <YStack>
            <Text variant="label">Live occupancy</Text>
            <Text variant="caption" color="muted">
              {isBusy ? "Near capacity" : "Comfortable flow"}
            </Text>
          </YStack>
          <Badge
            label={isBusy ? "Busy" : "Normal"}
            variant={isBusy ? "warning" : "success"}
          />
        </XStack>
        <YStack
          height={8}
          backgroundColor="$surfaceMuted"
          borderRadius="$full"
          overflow="hidden"
        >
          <YStack
            height="100%"
            width={`${ratio * 100}%`}
            backgroundColor={isBusy ? "$warning" : "$brand"}
            borderRadius="$full"
          />
        </YStack>
      </Card>
    </YStack>
  )
}
