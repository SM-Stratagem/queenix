import React from "react"
import { XStack, YStack } from "tamagui"
import { Card, Text, Badge } from "@queenix/ui"
import { ChevronRight, User, Clock } from "@tamagui/lucide-icons"
import { TYPE_META, SEVERITY_META, STATUS_META, type Incident } from "./meta"

export function IncidentCard({
  incident,
  onPress,
}: {
  incident: Incident
  onPress: () => void
}) {
  const t = TYPE_META[incident.type]
  const s = SEVERITY_META[incident.severity]
  const st = STATUS_META[incident.status]
  return (
    <Card
      variant="outlined"
      padding="sm"
      onPress={onPress}
      accessibilityLabel={`${incident.severity} severity ${incident.type.replace("_", " ")} incident: ${incident.title}`}
    >
      <XStack alignItems="flex-start" gap="$3">
        <YStack
          backgroundColor={t.bg}
          padding="$2.5"
          borderRadius="$md"
          alignItems="center"
          justifyContent="center"
        >
          {t.icon}
        </YStack>
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2" flexWrap="wrap">
            <Text variant="caption" weight="600" color="brand">
              {incident.code}
            </Text>
            <Badge label={t.label} variant="neutral" />
            <Badge label={s.label} variant={s.variant} />
            <Badge label={st.label} variant={st.variant} />
          </XStack>
          <Text variant="label" numberOfLines={2}>
            {incident.title}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {incident.location}
          </Text>
          <XStack alignItems="center" gap="$2" marginTop="$0.5">
            <User size={12} color="$textMuted" />
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {incident.reportedBy}
            </Text>
            <Text variant="caption" color="muted">
              •
            </Text>
            <XStack alignItems="center" gap="$1">
              <Clock size={12} color="$textMuted" />
              <Text variant="caption" color="muted">
                {incident.timeAgo}
              </Text>
            </XStack>
          </XStack>
        </YStack>
        <ChevronRight size={18} color="$textMuted" />
      </XStack>
    </Card>
  )
}
