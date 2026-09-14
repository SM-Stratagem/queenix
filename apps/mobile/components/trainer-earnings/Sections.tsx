import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text, Badge } from "@queenix/ui"
import { Wallet, TrendingUp, TrendingDown, CalendarClock, Dumbbell } from "@tamagui/lucide-icons"
import { formatMoney, formatMoneyShort } from "./format"

export function EarningsHero({
  isLoading,
  monthEarningsCents,
  monthTarget,
  progress,
  delta,
  isUp,
}: {
  isLoading: boolean
  monthEarningsCents: number
  monthTarget: number
  progress: number
  delta: number
  isUp: boolean
}) {
  if (isLoading) {
    return null // parent renders the Skeleton loader instead
  }
  return (
    <Card variant="elevated" padding="lg">
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack>
            <Text variant="caption" color="secondary" textTransform="uppercase">
              This month
            </Text>
            <XStack alignItems="baseline" gap="$2" marginTop="$1">
              <Text variant="h1" color="brand">
                {formatMoneyShort(monthEarningsCents)}
              </Text>
              <Text variant="h4" color="muted">
                AED
              </Text>
            </XStack>
            <XStack alignItems="center" gap="$1.5" marginTop="$1">
              {isUp ? (
                <TrendingUp size={14} color="$success500" />
              ) : (
                <TrendingDown size={14} color="$danger500" />
              )}
              <Text
                variant="bodySmall"
                weight="600"
                color={isUp ? "success" : "danger"}
              >
                {isUp ? "+" : ""}
                {delta}% vs last month
              </Text>
            </XStack>
          </YStack>
          <YStack backgroundColor="$brand50" padding="$3" borderRadius="$lg">
            <Wallet size={24} color="$brand" />
          </YStack>
        </XStack>

        <YStack gap="$1.5" marginTop="$2">
          <XStack justifyContent="space-between">
            <Text variant="caption" color="muted">
              Progress to target
            </Text>
            <Text variant="caption" weight="600">
              {formatMoney(monthEarningsCents)} / {formatMoney(monthTarget)}
            </Text>
          </XStack>
          <ProgressBar pct={progress} />
          <Text variant="caption" color="muted">
            {Math.round(progress)}% of {formatMoney(monthTarget)} target
          </Text>
        </YStack>
      </YStack>
    </Card>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return <Progress value={pct} />
}

import { Progress } from "tamagui"

export function EarningsSecondaryCards({
  pendingCents,
  paidCents,
  totalSessions,
  isLoading,
  breakdown,
}: {
  pendingCents: number
  paidCents: number
  totalSessions: number
  isLoading: boolean
  breakdown: Array<{ key: string; label: string; amount: number; pct: number }>
}) {
  return (
    <>
      <YStack paddingHorizontal="$4" marginTop="$4">
        <Card variant="outlined">
          <XStack alignItems="center" gap="$3">
            <YStack backgroundColor="$warning50" padding="$2.5" borderRadius="$md">
              <CalendarClock size={20} color="$warning500" />
            </YStack>
            <YStack flex={1}>
              <Text variant="label">Pending payout</Text>
              <Text variant="caption" color="muted">
                {formatMoney(pendingCents)} • Pays on the 30th
              </Text>
            </YStack>
            <Badge
              label={pendingCents > 0 ? "Pending" : "Cleared"}
              variant={pendingCents > 0 ? "warning" : "success"}
            />
          </XStack>
        </Card>
      </YStack>

      <YStack paddingHorizontal="$4" marginTop="$2">
        <XStack gap="$2">
          <Card flex={1} variant="outlined" padding="sm">
            <YStack gap="$0.5">
              <Text variant="caption" color="muted">
                Paid lifetime
              </Text>
              <Text variant="label" color="success">
                {formatMoney(paidCents)}
              </Text>
            </YStack>
          </Card>
          <Card flex={1} variant="outlined" padding="sm">
            <YStack gap="$0.5">
              <Text variant="caption" color="muted">
                Total sessions
              </Text>
              <Text variant="label">{totalSessions}</Text>
            </YStack>
          </Card>
        </XStack>
      </YStack>

      {!isLoading && breakdown.length > 0 && (
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$3">
            Breakdown
          </Text>
          <YStack gap="$2">
            {breakdown.map((b) => (
              <Card key={b.key} variant="outlined" padding="sm">
                <XStack alignItems="center" gap="$3">
                  <YStack
                    backgroundColor="$surfaceMuted"
                    padding="$2.5"
                    borderRadius="$md"
                  >
                    <Dumbbell size={18} color="$brand" />
                  </YStack>
                  <YStack flex={1} gap="$1">
                    <XStack justifyContent="space-between">
                      <Text variant="label">{b.label}</Text>
                      <Text variant="label">{formatMoney(b.amount)}</Text>
                    </XStack>
                    <Progress value={b.pct} size="sm" />
                    <Text variant="caption" color="muted">
                      {b.pct}% of total
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            ))}
          </YStack>
        </YStack>
      )}
    </>
  )
}
