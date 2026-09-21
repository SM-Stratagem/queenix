import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text, Badge, Button } from "@queenix/ui"
import { Play, FileText } from "@tamagui/lucide-icons"
import {
  formatTime,
  getStatusVariant,
  getStatusLabel,
  deriveStatus,
  type SessionStatus,
} from "./format"

export function HeroStat({
  icon,
  value,
  label,
  flex,
}: {
  icon: React.ReactNode
  value: string
  label: string
  flex?: number
}) {
  return (
    <YStack
      flex={flex}
      gap="$1"
      backgroundColor="$surfaceMuted"
      padding="$3"
      borderRadius="$md"
    >
      <XStack>{icon}</XStack>
      <Text variant="h3">{value}</Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </YStack>
  )
}

export function QuickAction({
  icon,
  label,
  onPress,
  flex,
}: {
  icon: React.ReactNode
  label: string
  onPress: () => void
  flex?: number
}) {
  return (
    <YStack
      flex={flex}
      alignItems="center"
      gap="$2"
      onPress={onPress}
      pressStyle={{ opacity: 0.7, scale: 0.97 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <YStack
        backgroundColor="$brand"
        padding="$3"
        borderRadius="$xl"
        alignItems="center"
        justifyContent="center"
        width={56}
        height={56}
      >
        {icon}
      </YStack>
      <Text variant="caption" weight="600" align="center">
        {label}
      </Text>
    </YStack>
  )
}

export function SessionRow({
  scheduledAt,
  durationMinutes,
  memberName,
  dbStatus,
  onStart,
  onCancel,
  onViewNotes,
}: {
  scheduledAt: number
  durationMinutes: number
  memberName: string
  memberId: string
  dbStatus: string
  onStart: () => void
  onCancel?: () => void
  onViewNotes: () => void
}) {
  // Local compatibility shim — original screen used 'in-progress' which is
  // actually SessionStatus 'active'. We map at the boundary.
  const composableStatus =
    dbStatus === "in-progress" ? "active" : (dbStatus as SessionStatus)
  const status = deriveStatus(scheduledAt, durationMinutes, composableStatus)
  const variant = getStatusVariant(status)
  const statusLabel = getStatusLabel(status)
  const startTime = formatTime(scheduledAt)
  const endTime = formatTime(scheduledAt + durationMinutes * 60 * 1000)
  const active = status === "upcoming" || status === "active"

  return (
    <Card
      variant="outlined"
      padding="sm"
      onPress={active ? onStart : onViewNotes}
      accessibilityLabel={`PT with ${memberName} at ${startTime}, ${statusLabel}`}
    >
      <XStack alignItems="center" gap="$3">
        <YStack alignItems="center" width={56} gap="$0.5">
          <Text variant="h4" color={status === "completed" ? "muted" : "primary"}>
            {startTime}
          </Text>
          <Text variant="caption" color="muted">
            {durationMinutes}m
          </Text>
        </YStack>
        <YStack
          width={3}
          alignSelf="stretch"
          backgroundColor="$brand"
          borderRadius="$full"
        />
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2">
            <Text
              variant="label"
              textDecorationLine={status === "completed" ? "line-through" : "none"}
            >
              {memberName}
            </Text>
            <Badge label="PT" variant="brand" size="sm" />
          </XStack>
          <Text variant="caption" color="muted">
            {startTime}–{endTime}
          </Text>
          <XStack marginTop="$1">
            <Badge label={statusLabel} variant={variant} size="sm" />
          </XStack>
        </YStack>
        <YStack gap="$1" alignItems="center">
          {status === "upcoming" ? (
            <>
              <Button
                label="Start"
                size="sm"
                variant="primary"
                onPress={onStart}
                icon={<Play size={14} color="$textOnBrand" />}
              />
              {onCancel && (
                <Button label="Cancel" size="sm" variant="ghost" onPress={onCancel} />
              )}
            </>
          ) : status === "active" ? (
            <Button label="Resume" size="sm" variant="primary" onPress={onStart} />
          ) : (
            <XStack
              onPress={onViewNotes}
              pressStyle={{ opacity: 0.6 }}
              accessibilityRole="button"
              accessibilityLabel="View client detail"
              padding="$2"
            >
              <FileText size={20} color="$textMuted" />
            </XStack>
          )}
        </YStack>
      </XStack>
    </Card>
  )
}
