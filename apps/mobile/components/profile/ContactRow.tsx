import React from "react"
import { XStack, YStack } from "tamagui"
import { Text } from "@queenix/ui"

export type Shift = {
  id: string
  date: string
  start: string
  end: string
  hoursLogged: string
  status: "completed" | "active" | "upcoming"
}

export function ContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <XStack alignItems="center" gap="$2">
      {icon}
      <Text variant="caption" color="muted" width={90}>
        {label}
      </Text>
      <Text variant="bodySmall" weight="500" numberOfLines={1} flex={1}>
        {value}
      </Text>
    </XStack>
  )
}
