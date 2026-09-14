import React from "react"
import { YStack, XStack } from "tamagui"
import { Text, Card, Button, Badge } from "@queenix/ui"
import { CheckCircle2, XCircle, RotateCw } from "@tamagui/lucide-icons"
import { formatRelative } from "./format"

export type LastScan = {
  token: string
  granted: boolean
  reason?: string
  user?: {
    _id: string
    fullName?: string
    avatarUrl?: string
  } | null
  scannedAt: number
  direction: "in" | "out"
}

export function LastResultCard({
  scan,
  onReset,
}: {
  scan: LastScan
  onReset: () => void
}) {
  const granted = scan.granted
  return (
    <YStack paddingHorizontal="$4" marginTop="$4">
      <Text variant="h4" marginBottom="$2">Last result</Text>
      <Card
        variant="elevated"
        padding="md"
        backgroundColor={granted ? "$success50" : "$danger50"}
        borderColor={granted ? "$success" : "$danger"}
        accessibilityLabel={`Last scan ${granted ? "granted" : "denied"}`}
      >
        <XStack alignItems="center" gap="$3">
          <YStack
            backgroundColor={granted ? "$success" : "$danger"}
            padding="$2.5"
            borderRadius="$full"
          >
            {granted ? (
              <CheckCircle2 size={20} color="$textOnBrand" />
            ) : (
              <XCircle size={20} color="$textOnBrand" />
            )}
          </YStack>
          <YStack flex={1}>
            <Text variant="label" weight="700">
              {granted
                ? scan.user?.fullName ?? "Access granted"
                : scan.reason ?? "Access denied"}
            </Text>
            <Text variant="caption" color="muted">
              {formatRelative(scan.scannedAt)} • {scan.direction.toUpperCase()}
            </Text>
          </YStack>
          {granted && (
            <Button
              label="Reset"
              variant="ghost"
              size="sm"
              icon={<RotateCw size={14} color="$textMuted" />}
              onPress={onReset}
              accessibilityLabel="Clear last result"
            />
          )}
        </XStack>
      </Card>
    </YStack>
  )
}
