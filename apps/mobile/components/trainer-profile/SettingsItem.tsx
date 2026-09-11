import React from "react"
import { XStack, YStack } from "tamagui"
import { Card, Text } from "@queenix/ui"
import { ChevronRight } from "@tamagui/lucide-icons"

export function SettingsItem({
  icon,
  title,
  subtitle,
  onPress,
  right,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  onPress?: () => void
  right?: React.ReactNode
}) {
  return (
    <Card variant="outlined" padding="sm" onPress={onPress}>
      <XStack alignItems="center" gap="$3">
        <YStack backgroundColor="$surfaceMuted" padding="$2.5" borderRadius="$md">
          {icon}
        </YStack>
        <YStack flex={1}>
          <Text variant="body" weight="500">
            {title}
          </Text>
          {subtitle && (
            <Text variant="caption" color="muted">
              {subtitle}
            </Text>
          )}
        </YStack>
        {right ?? <ChevronRight size={18} color="$textMuted" />}
      </XStack>
    </Card>
  )
}
