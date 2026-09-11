import React from "react"
import { XStack, YStack } from "tamagui"
import { Text, Badge } from "@queenix/ui"
import { Award, Crown, Sparkles } from "@tamagui/lucide-icons"

export function TabPill({
  label,
  active,
  onPress,
  flex,
}: {
  label: string
  active: boolean
  onPress: () => void
  flex?: number
}) {
  return (
    <XStack
      flex={flex}
      alignItems="center"
      justifyContent="center"
      paddingVertical="$2.5"
      borderRadius="$md"
      backgroundColor={active ? "$surface" : "transparent"}
      onPress={onPress}
      pressStyle={{ opacity: 0.85 }}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      shadowColor={active ? "$shadowColor" : "transparent"}
      shadowOffset={{ width: 0, height: 1 }}
      shadowOpacity={active ? 0.1 : 0}
      shadowRadius={2}
    >
      <Text variant="label" color={active ? "brand" : "secondary"}>
        {label}
      </Text>
    </XStack>
  )
}

const TIER_ICONS: Record<string, React.ComponentType<any>> = {
  Silver: Award,
  Gold: Crown,
  Diamond: Sparkles,
}

export function TierRow({
  name,
  from,
  to,
  current,
  reached,
  perks,
}: {
  name: string
  from: number
  to: number
  current: boolean
  reached: boolean
  perks: string[]
}) {
  const Icon = TIER_ICONS[name] ?? Sparkles
  return (
    <XStack gap="$3" alignItems="flex-start">
      <YStack
        backgroundColor={current ? "$brand50" : "$surfaceMuted"}
        padding="$2.5"
        borderRadius="$md"
      >
        <Icon size={20} color={current ? "$brand" : "$textSecondary"} />
      </YStack>
      <YStack flex={1} gap="$1">
        <XStack alignItems="center" gap="$2">
          <Text variant="label">{name}</Text>
          {current && <Badge label="Current" variant="brand" />}
          {!current && reached && <Badge label="Unlocked" variant="success" />}
        </XStack>
        <Text variant="caption" color="muted">
          {from.toLocaleString()} — {to.toLocaleString()} pts
        </Text>
        <XStack gap="$1" flexWrap="wrap" marginTop="$1">
          {perks.map((p) => (
            <XStack
              key={p}
              backgroundColor="$surfaceMuted"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$full"
            >
              <Text variant="caption" color="secondary">
                {p}
              </Text>
            </XStack>
          ))}
        </XStack>
      </YStack>
    </XStack>
  )
}
