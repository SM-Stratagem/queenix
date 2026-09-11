import React from "react"
import { XStack, YStack } from "tamagui"
import { Text } from "@queenix/ui"
import { Check } from "@tamagui/lucide-icons"

export function PlanBenefit({ text }: { text: string }) {
  return (
    <XStack alignItems="center" gap="$2">
      <YStack backgroundColor="$brand50" padding="$1" borderRadius="$full">
        <Check size={12} color="$brand" />
      </YStack>
      <Text variant="bodySmall" color="primary">
        {text}
      </Text>
    </XStack>
  )
}
