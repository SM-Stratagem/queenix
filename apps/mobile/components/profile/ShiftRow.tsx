import React from "react"
import { XStack, YStack } from "tamagui"
import { Card, Text, Badge } from "@queenix/ui"
import { Clock } from "@tamagui/lucide-icons"
import type { Shift } from "./ContactRow"

export function ShiftRow({ shift }: { shift: Shift }) {
  return (
    <Card
      variant="outlined"
      padding="sm"
      accessibilityLabel={`${shift.date}, ${shift.start} to ${shift.end}, ${shift.hoursLogged}`}
    >
      <XStack alignItems="center" gap="$3">
        <YStack
          backgroundColor="$brand50"
          padding="$2.5"
          borderRadius="$md"
          alignItems="center"
          justifyContent="center"
        >
          <Clock size={18} color="$brand" />
        </YStack>
        <YStack flex={1} gap="$0.5">
          <Text variant="label">{shift.date}</Text>
          <Text variant="caption" color="secondary">
            {shift.start} → {shift.end}
          </Text>
        </YStack>
        <YStack alignItems="flex-end" gap="$0.5">
          <Text variant="label" color="brand">
            {shift.hoursLogged}
          </Text>
          <Badge
            label={shift.status === "active" ? "Active" : shift.status === "completed" ? "Completed" : "Upcoming"}
            variant={shift.status === "active" ? "info" : shift.status === "completed" ? "success" : "neutral"}
          />
        </YStack>
      </XStack>
    </Card>
  )
}
