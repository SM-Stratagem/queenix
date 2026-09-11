import React from "react"
import { XStack, YStack } from "tamagui"
import {
  Card,
  Text,
  Badge,
  Progress,
  Button,
  Divider,
  Avatar,
} from "@queenix/ui"
import {
  Clock,
  Users,
  MapPin,
  PlayCircle,
  ChevronRight,
} from "@tamagui/lucide-icons"

export type RosterEntry = {
  id: string
  name: string
  memberId: string
  status: "checked_in" | "booked" | "late" | "no_show"
  time?: string
}

export type ClassInstance = {
  id: string
  name: string
  startsAt: number
  durationMin: number
  trainer: string
  room: string
  capacity: number
  attendees: RosterEntry[]
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ClassCard({
  cls,
  checkedIn,
  late,
  noShow,
  onOpen,
}: {
  cls: ClassInstance
  checkedIn: number
  late: number
  noShow: number
  onOpen: () => void
}) {
  const capacityPct = Math.min(100, (cls.attendees.length / cls.capacity) * 100)
  const rosterPreview = cls.attendees.slice(0, 4)
  const overflowCount = cls.attendees.length - rosterPreview.length

  return (
    <Card variant="elevated" padding="md">
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack flex={1} gap="$1">
          <Text variant="h3" numberOfLines={1}>
            {cls.name}
          </Text>
          <XStack alignItems="center" gap="$2" flexWrap="wrap">
            <XStack alignItems="center" gap="$1">
              <Clock size={14} color="$textMuted" />
              <Text variant="bodySmall" color="secondary">
                {formatTime(cls.startsAt)} • {cls.durationMin} min
              </Text>
            </XStack>
          </XStack>
          <XStack alignItems="center" gap="$2">
            <XStack alignItems="center" gap="$1">
              <Users size={14} color="$textMuted" />
              <Text variant="bodySmall" color="secondary">
                {cls.trainer}
              </Text>
            </XStack>
            <Text variant="caption" color="muted">
              •
            </Text>
            <XStack alignItems="center" gap="$1">
              <MapPin size={14} color="$textMuted" />
              <Text variant="bodySmall" color="secondary">
                {cls.room}
              </Text>
            </XStack>
          </XStack>
        </YStack>
        {cls.startsAt - Date.now() < 60 * 60 * 1000 && cls.startsAt > Date.now() && (
          <Badge label="Starting soon" variant="warning" />
        )}
      </XStack>

      <YStack marginTop="$3" gap="$1.5">
        <XStack justifyContent="space-between">
          <Text variant="caption" color="muted">
            Capacity
          </Text>
          <Text variant="caption" weight="600">
            {cls.attendees.length}/{cls.capacity}
          </Text>
        </XStack>
        <Progress
          value={capacityPct}
          color={capacityPct > 90 ? "$warning" : "$brand"}
          size="sm"
        />
      </YStack>

      {(late > 0 || noShow > 0) && (
        <XStack gap="$2" marginTop="$2">
          {late > 0 && <Badge label={`${late} late`} variant="warning" />}
          {noShow > 0 && <Badge label={`${noShow} no-show`} variant="danger" />}
        </XStack>
      )}

      <Divider marginVertical="$3" />

      <XStack alignItems="center" gap="$2">
        <XStack>
          {rosterPreview.length > 0 ? (
            rosterPreview.map((a, i) => (
              <YStack key={a.id} marginLeft={i === 0 ? 0 : -10}>
                <Avatar
                  name={a.name}
                  size="sm"
                  fallbackColor={a.status === "checked_in" ? "$success" : "$info"}
                />
              </YStack>
            ))
          ) : (
            <Text variant="caption" color="muted">
              No bookings yet
            </Text>
          )}
        </XStack>
        <Text variant="caption" color="muted" flex={1}>
          {overflowCount > 0
            ? `+${overflowCount} more in roster`
            : `${checkedIn} of ${cls.attendees.length} checked in`}
        </Text>
        <Button
          label="Start check-in"
          variant="primary"
          size="sm"
          icon={<PlayCircle size={14} color="$textOnBrand" />}
          onPress={onOpen}
          accessibilityLabel={`Start check-in for ${cls.name}`}
        />
      </XStack>

      <YStack marginTop="$2">
        <Card
          variant="outlined"
          padding="sm"
          onPress={onOpen}
          accessibilityLabel={`View full roster for ${cls.name}`}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <Text variant="label">View full roster</Text>
            <ChevronRight size={16} color="$textMuted" />
          </XStack>
        </Card>
      </YStack>
    </Card>
  )
}
