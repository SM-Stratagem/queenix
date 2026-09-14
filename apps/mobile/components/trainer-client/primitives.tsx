import React from "react"
import { YStack, XStack } from "tamagui"
import { Text, Card } from "@queenix/ui"

export function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <YStack gap="$2">
      <Text variant="h4">{title}</Text>
      <Card variant="outlined" padding="sm">
        <YStack>{children}</YStack>
      </Card>
    </YStack>
  )
}

export function KeyValue({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <XStack alignItems="center" gap="$2" paddingVertical="$2.5">
      {icon}
      <Text variant="bodySmall" color="secondary" flex={1}>
        {label}
      </Text>
      <Text variant="bodySmall" weight="500" textAlign="right" flex={1.5} numberOfLines={1}>
        {value}
      </Text>
    </XStack>
  )
}

export function Stat({
  label,
  value,
  flex,
}: {
  label: string
  value: string
  flex?: number
}) {
  return (
    <Card variant="outlined" padding="sm" flex={flex}>
      <YStack gap="$0.5">
        <Text variant="caption" color="muted">
          {label}
        </Text>
        <Text variant="bodySmall" weight="600">
          {value}
        </Text>
      </YStack>
    </Card>
  )
}
