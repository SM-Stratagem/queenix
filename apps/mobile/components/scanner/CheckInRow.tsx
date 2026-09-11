import React from "react"
import { XStack, YStack } from "tamagui"
import { Card, Text, Avatar } from "@queenix/ui"
import { CheckCircle2, XCircle } from "@tamagui/lucide-icons"

export type CheckInEntry = {
  granted: boolean
  user?: { fullName?: string | null; avatarUrl?: string | null } | null
  accessPointId: string
  timestamp: number
  reason?: string | null
}

function formatRelative(ms: number): string {
  const d = Date.now() - ms
  if (d < 60_000) return `${Math.max(1, Math.floor(d / 1000))}s ago`
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} min ago`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`
  return `${Math.floor(d / 86_400_000)}d ago`
}

export function CheckInRow({ entry }: { entry: CheckInEntry }) {
  const isGranted = Boolean(entry.granted)
  const name = entry.user?.fullName ?? "Unknown"
  return (
    <Card
      variant="outlined"
      padding="sm"
      accessibilityLabel={`${name}, ${isGranted ? "granted" : "denied"} ${formatRelative(entry.timestamp)}`}
    >
      <XStack alignItems="center" gap="$3">
        <Avatar
          name={name}
          size="md"
          src={entry.user?.avatarUrl ?? undefined}
          fallbackColor={isGranted ? "$success" : "$danger"}
        />
        <YStack flex={1} gap="$0.5">
          <Text variant="label" numberOfLines={1}>
            {name}
          </Text>
          <XStack alignItems="center" gap="$2">
            <Text variant="caption" color="muted">
              {entry.accessPointId}
            </Text>
            <Text variant="caption" color="muted">
              • {formatRelative(entry.timestamp)}
            </Text>
          </XStack>
          {entry.reason && (
            <Text variant="caption" color="danger">
              {entry.reason}
            </Text>
          )}
        </YStack>
        <XStack alignItems="center" gap="$1.5">
          {isGranted ? (
            <CheckCircle2 size={18} color="$success500" />
          ) : (
            <XCircle size={18} color="$danger500" />
          )}
          <Text
            variant="caption"
            weight="600"
            color={isGranted ? "success" : "danger"}
          >
            {isGranted ? "Granted" : "Denied"}
          </Text>
        </XStack>
      </XStack>
    </Card>
  )
}
