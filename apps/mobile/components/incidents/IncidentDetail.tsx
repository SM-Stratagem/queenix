import React from "react"
import { XStack, YStack } from "tamagui"
import { Text, Card, Badge, Button, Divider } from "@queenix/ui"
import { TYPE_META, SEVERITY_META, STATUS_META, type Incident } from "./meta"

export function IncidentDetail({
  incident,
  onResolve,
}: {
  incident: Incident
  onResolve: () => void
}) {
  const t = TYPE_META[incident.type]
  const s = SEVERITY_META[incident.severity]
  const st = STATUS_META[incident.status]
  return (
    <YStack gap="$3">
      <XStack gap="$2" flexWrap="wrap">
        <Badge label={t.label} variant="neutral" />
        <Badge label={s.label} variant={s.variant} />
        <Badge label={st.label} variant={st.variant} />
      </XStack>
      <Card variant="filled" backgroundColor="$surfaceMuted" padding="md">
        <Text variant="label">Description</Text>
        <Text variant="bodySmall" color="secondary" marginTop="$1">
          {incident.description}
        </Text>
      </Card>
      <YStack gap="$2">
        <XStack justifyContent="space-between">
          <Text variant="caption" color="muted">Location</Text>
          <Text variant="caption" weight="600">{incident.location}</Text>
        </XStack>
        <Divider />
        <XStack justifyContent="space-between">
          <Text variant="caption" color="muted">Reported by</Text>
          <Text variant="caption" weight="600">{incident.reportedBy}</Text>
        </XStack>
        <Divider />
        <XStack justifyContent="space-between">
          <Text variant="caption" color="muted">Reported</Text>
          <Text variant="caption" weight="600">{incident.timeAgo}</Text>
        </XStack>
      </YStack>
      <XStack gap="$2">
        <Button
          label="Mark resolved"
          variant="primary"
          size="md"
          flex={1}
          onPress={onResolve}
          accessibilityLabel="Mark incident as resolved"
          disabled={incident.status === "resolved"}
        />
        <Button
          label="Escalate"
          variant="outline"
          size="md"
          flex={1}
          onPress={() => {}}
          accessibilityLabel="Escalate incident"
        />
      </XStack>
    </YStack>
  )
}
