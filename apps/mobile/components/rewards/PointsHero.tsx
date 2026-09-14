import React from "react"
import { YStack, XStack, Progress as TProgress } from "tamagui"
import { Text, Badge, Button, Skeleton } from "@queenix/ui"
import { Award } from "@tamagui/lucide-icons"

export function PointsHeroCard({
  tier,
  pointsBalance,
  tierProgressPct,
  toNextLabel,
  isLoading,
  onHowToEarn,
  onTiers,
}: {
  tier: "Silver" | "Gold" | "Platinum"
  pointsBalance: number
  tierProgressPct: number
  toNextLabel: string
  isLoading: boolean
  onHowToEarn: () => void
  onTiers: () => void
}) {
  return (
    <YStack
      backgroundColor="$brand"
      padding="$5"
      borderRadius="$xl"
      gap="$3"
      shadowColor="$shadowColor"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.15}
      shadowRadius={12}
      elevation={6}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap="$2">
          <YStack backgroundColor="$brand600" padding="$2" borderRadius="$full">
            <Award size={18} color="$textOnBrand" />
          </YStack>
          <Text variant="caption" weight="700" textTransform="uppercase">
            Your points
          </Text>
        </XStack>
        <Badge label={tier} variant="brand" />
      </XStack>

      <YStack>
        {isLoading ? (
          <Skeleton width="40%" height={48} />
        ) : (
          <Text variant="display">{pointsBalance.toLocaleString()}</Text>
        )}
        <Text variant="bodySmall" color="muted">
          {toNextLabel}
        </Text>
      </YStack>

      <ProgressBar pct={tierProgressPct} />

      <XStack gap="$2" marginTop="$2">
        <Button
          label="How to earn"
          variant="secondary"
          size="sm"
          onPress={onHowToEarn}
        />
        <Button
          label="Tiers"
          variant="ghost"
          size="sm"
          onPress={onTiers}
        />
      </XStack>
    </YStack>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <TProgress value={pct} size="sm" backgroundColor="$brand600" />
  )
}
