import React from "react"
import { YStack } from "tamagui"
import { Card, Text } from "@queenix/ui"
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "@tamagui/lucide-icons"
import type { SeverityTone } from "./meta"

const COLOR_MAP: Record<SeverityTone, string> = {
  critical: "$danger",
  high: "$warning",
  medium: "$info",
  low: "$success",
}

const BG_MAP: Record<SeverityTone, string> = {
  critical: "$danger100",
  high: "$warning100",
  medium: "$info100",
  low: "$success100",
}

export function SeverityStat({
  label,
  count,
  tone,
  flex,
}: {
  label: string
  count: number
  tone: SeverityTone
  flex?: number
}) {
  const ICON: Record<SeverityTone, React.ReactNode> = {
    critical: <AlertOctagon size={16} color={COLOR_MAP[tone]} />,
    high: <AlertTriangle size={16} color={COLOR_MAP[tone]} />,
    medium: <Info size={16} color={COLOR_MAP[tone]} />,
    low: <CheckCircle2 size={16} color={COLOR_MAP[tone]} />,
  }
  return (
    <Card
      variant="outlined"
      padding="sm"
      flex={flex}
      accessibilityLabel={`${count} ${label} open incidents`}
    >
      <YStack gap="$1">
        {ICON[tone]}
        <Text variant="h3" color={COLOR_MAP[tone]}>
          {count}
        </Text>
        <Text variant="caption" color="muted">
          {label}
        </Text>
      </YStack>
    </Card>
  )
}
