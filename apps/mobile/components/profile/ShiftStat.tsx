import React from "react"
import { YStack } from "tamagui"
import { Card, Text } from "@queenix/ui"

export function ShiftStat({
  icon,
  label,
  value,
  flex,
}: {
  icon: React.ReactNode
  label: string
  value: string
  flex?: number
}) {
  return (
    <Card variant="outlined" padding="sm" flex={flex}>
      <YStack gap="$1">
        {icon}
        <Text variant="h3">{value}</Text>
        <Text variant="caption" color="muted">
          {label}
        </Text>
      </YStack>
    </Card>
  )
}
