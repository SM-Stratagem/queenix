import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text, Badge } from "@queenix/ui"
import { Wifi } from "@tamagui/lucide-icons"

const ACCESS_POINTS = [
  { id: "front-door", label: "Front door", status: "Online" as const },
  { id: "back-door", label: "Back door (staff)", status: "Online" as const },
  { id: "studio-gates", label: "Studio gates", status: "Online" as const },
]

export function AccessView({
  currentOccupancy,
}: {
  currentOccupancy: number
}) {
  return (
    <Card variant="outlined" padding="md">
      <YStack gap="$3">
        {ACCESS_POINTS.map((p) => (
          <XStack key={p.id} alignItems="center" gap="$3">
            <YStack backgroundColor="$success50" padding="$2.5" borderRadius="$md">
              <Wifi size={20} color="$success600" />
            </YStack>
            <YStack flex={1}>
              <Text variant="body" weight="500">
                {p.label}
              </Text>
              <Text variant="caption" color="muted">
                {p.id === "front-door"
                  ? `Current occupancy: ${currentOccupancy}`
                  : p.id === "back-door"
                    ? "Hardware telemetry pending — show last snapshot"
                    : "Connected"}
              </Text>
            </YStack>
            <Badge label={p.status} variant="success" />
          </XStack>
        ))}
      </YStack>
    </Card>
  )
}

export function TabChip({
  active,
  label,
  icon,
  onPress,
  badge,
}: {
  active: boolean
  label: string
  icon: React.ReactNode
  onPress: () => void
  badge?: string
}) {
  return (
    <YStack
      flex={1}
      paddingVertical="$2.5"
      paddingHorizontal="$2"
      alignItems="center"
      gap="$1"
      borderRadius="$lg"
      backgroundColor={active ? "$brand" : "$surfaceMuted"}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      pressStyle={{ opacity: 0.85 }}
    >
      <XStack alignItems="center" gap="$1.5">
        {React.cloneElement(icon as React.ReactElement<{ color?: string }>, {
          color: active ? "inverse" : "secondary",
        })}
        <Text
          variant="bodySmall"
          weight="600"
          color={active ? "inverse" : "secondary"}
        >
          {label}
        </Text>
        {badge && (
          <XStack
            backgroundColor="$danger500"
            paddingHorizontal="$1.5"
            borderRadius="$full"
            minWidth={16}
            height={16}
            alignItems="center"
            justifyContent="center"
          >
            <Text variant="caption" color="inverse" weight="700" fontSize={9}>
              {badge}
            </Text>
          </XStack>
        )}
      </XStack>
    </YStack>
  )
}
