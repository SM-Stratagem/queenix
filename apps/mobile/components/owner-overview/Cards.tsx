import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text } from "@queenix/ui"
import { TrendingUp, TrendingDown } from "@tamagui/lucide-icons"

export function KPICard({
  label,
  value,
  trend,
  icon,
  flex,
}: {
  label: string
  value: string
  trend: "up" | "down"
  icon: React.ReactNode
  flex?: number
}) {
  const isUp = trend === "up"
  return (
    <Card variant="elevated" padding="md" flex={flex}>
      <YStack gap="$2">
        <XStack alignItems="center" justifyContent="space-between">
          <YStack backgroundColor="$brand50" padding="$2" borderRadius="$md">
            {icon}
          </YStack>
          {isUp ? (
            <TrendingUp size={14} color="$success500" />
          ) : (
            <TrendingDown size={14} color="$danger500" />
          )}
        </XStack>
        <YStack gap="$0.5">
          <Text variant="caption" color="muted">
            {label}
          </Text>
          <Text variant="h3">{value}</Text>
          <Text variant="caption" color={isUp ? "success" : "danger"} weight="600">
            {isUp ? "Live" : "No data"}
          </Text>
        </YStack>
      </YStack>
    </Card>
  )
}

export function QuickAction({
  icon,
  label,
  badge,
  onPress,
  flex,
}: {
  icon: React.ReactNode
  label: string
  badge?: string
  onPress: () => void
  flex?: number
}) {
  return (
    <YStack
      flex={flex}
      alignItems="center"
      gap="$2"
      onPress={onPress}
      pressStyle={{ opacity: 0.7, scale: 0.97 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <YStack position="relative">
        <YStack
          backgroundColor="$brand"
          padding="$3"
          borderRadius="$xl"
          alignItems="center"
          justifyContent="center"
          width={56}
          height={56}
        >
          {icon}
        </YStack>
        {badge && (
          <YStack
            position="absolute"
            top={-4}
            right={-4}
            backgroundColor="$danger500"
            borderRadius="$full"
            paddingHorizontal="$1.5"
            paddingVertical="$0.5"
            minWidth={20}
            alignItems="center"
          >
            <Text variant="caption" color="inverse" weight="700" fontSize={10}>
              {badge}
            </Text>
          </YStack>
        )}
      </YStack>
      <Text variant="caption" weight="600" align="center">
        {label}
      </Text>
    </YStack>
  )
}
