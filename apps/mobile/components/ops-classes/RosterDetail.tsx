import React from "react"
import { XStack, YStack } from "tamagui"
import { Text, Button } from "@queenix/ui"
import { Check, Clock, Users, PlayCircle } from "@tamagui/lucide-icons"
import { SummaryStat } from "./SummaryStat"
import { RosterRow } from "./RosterRow"
import type { ClassInstance } from "./ClassCard"

export function RosterDetail({ cls }: { cls: ClassInstance }) {
  const checkedIn = cls.attendees.filter((a) => a.status === "checked_in")
  const others = cls.attendees.filter((a) => a.status !== "checked_in")
  return (
    <YStack gap="$3">
      <XStack gap="$2">
        <SummaryStat
          icon={<Check size={18} color="$success500" />}
          label="Checked in"
          value={checkedIn.length.toString()}
          flex={1}
        />
        <SummaryStat
          icon={<Clock size={18} color="$warning500" />}
          label="Pending"
          value={others.length.toString()}
          flex={1}
        />
        <SummaryStat
          icon={<Users size={18} color="$brand" />}
          label="Capacity"
          value={`${cls.attendees.length}/${cls.capacity}`}
          flex={1}
        />
      </XStack>

      <YStack gap="$2">
        <Text variant="h4">Checked in</Text>
        {checkedIn.length === 0 ? (
          <Text variant="bodySmall" color="muted">
            No one has checked in yet.
          </Text>
        ) : (
          checkedIn.map((a) => <RosterRow key={a.id} entry={a} />)
        )}
      </YStack>

      <YStack gap="$2" marginTop="$2">
        <Text variant="h4">Awaiting</Text>
        {others.length === 0 ? (
          <Text variant="bodySmall" color="muted">
            Everyone has checked in.
          </Text>
        ) : (
          others.map((a) => <RosterRow key={a.id} entry={a} />)
        )}
      </YStack>

      <YStack marginTop="$2">
        <Button
          label="Open scanner for this class"
          variant="primary"
          size="md"
          fullWidth
          icon={<PlayCircle size={18} color="$textOnBrand" />}
          onPress={() => {}}
          accessibilityLabel="Open scanner for this class"
        />
      </YStack>
    </YStack>
  )
}
