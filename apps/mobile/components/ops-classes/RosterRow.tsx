import React from "react"
import { XStack, YStack } from "tamagui"
import { Card, Text, Avatar, Badge } from "@queenix/ui"
import type { RosterEntry } from "./ClassCard"

const COLORS: Record<
  RosterEntry["status"],
  {
    bg: string
    fg: string
    label: string
    tone: "success" | "warning" | "danger" | "neutral"
  }
> = {
  checked_in: { bg: "$success100", fg: "$success", label: "In", tone: "success" },
  booked: { bg: "$surfaceMuted", fg: "$textPrimary", label: "Booked", tone: "neutral" },
  late: { bg: "$warning100", fg: "$warning", label: "Late", tone: "warning" },
  no_show: { bg: "$danger100", fg: "$danger", label: "No-show", tone: "danger" },
}

export function RosterRow({ entry }: { entry: RosterEntry }) {
  const c = COLORS[entry.status]
  const label = entry.status === "late" && entry.time ? entry.time : c.label
  return (
    <Card variant="outlined" padding="sm" accessibilityLabel={`${entry.name}, ${label}`}>
      <XStack alignItems="center" gap="$3">
        <Avatar name={entry.name} size="md" fallbackColor={c.fg} />
        <YStack flex={1} gap="$0.5">
          <Text variant="label" numberOfLines={1}>
            {entry.name}
          </Text>
          <Text variant="caption" color="muted">
            {entry.memberId}
          </Text>
        </YStack>
        <Badge label={label} variant={c.tone} />
      </XStack>
    </Card>
  )
}
