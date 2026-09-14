import React from "react"
import { YStack, XStack } from "tamagui"
import { Text, Card } from "@queenix/ui"
import { formatMoney } from "./format"

export function PaymentsHeader({
  title,
  onBack,
}: {
  title: string
  onBack: () => void
}) {
  return (
    <XStack alignItems="center" gap="$2">
      <YStack
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        pressStyle={{ opacity: 0.7 }}
        padding="$2"
        borderRadius="$full"
        backgroundColor="$surfaceMuted"
      >
        <YStack
          accessibilityElementsHidden
          style={{ transform: [{ rotate: "180deg" }] }}
        >
          <Text>‹</Text>
        </YStack>
      </YStack>
      <Text variant="h1">{title}</Text>
    </XStack>
  )
}

export function QuickStats({
  thisMonthTotal,
  thisMonthCount,
  memberSince,
  monthsActive,
}: {
  thisMonthTotal: number
  thisMonthCount: number
  memberSince: string | null
  monthsActive: number | null
}) {
  return (
    <XStack gap="$3">
      <Card variant="outlined" padding="md" flex={1}>
        <Text variant="caption" color="muted">This month</Text>
        <Text variant="h3" marginTop="$1">
          {formatMoney(thisMonthTotal, "AED")}
        </Text>
        <Text variant="caption" color="success">
          {thisMonthCount} {thisMonthCount === 1 ? "charge" : "charges"}
        </Text>
      </Card>
      <Card variant="outlined" padding="md" flex={1}>
        <Text variant="caption" color="muted">Member since</Text>
        <Text variant="h3" marginTop="$1">
          {memberSince ?? "—"}
        </Text>
        <Text variant="caption" color="muted">
          {monthsActive ? `${monthsActive} months` : "—"}
        </Text>
      </Card>
    </XStack>
  )
}
