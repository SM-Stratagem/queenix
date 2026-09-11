import React from "react"
import { XStack, YStack } from "tamagui"
import { Card, Text } from "@queenix/ui"
import { ChevronRight } from "@tamagui/lucide-icons"

export function SettingsRow({
  icon,
  label,
  description,
  right,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  description?: string
  right?: React.ReactNode
  onPress?: () => void
}) {
  return (
    <Card
      variant="outlined"
      padding="sm"
      onPress={onPress}
      accessibilityLabel={label}
    >
      <XStack alignItems="center" gap="$3">
        <YStack
          backgroundColor="$surfaceMuted"
          padding="$2.5"
          borderRadius="$md"
        >
          {icon}
        </YStack>
        <YStack flex={1} gap="$0.5">
          <Text variant="label">{label}</Text>
          {description && (
            <Text variant="caption" color="muted" numberOfLines={1}>
              {description}
            </Text>
          )}
        </YStack>
        {right ?? <ChevronRight size={18} color="$textMuted" />}
      </XStack>
    </Card>
  )
}
