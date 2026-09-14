import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text, Divider, Badge, Button, EmptyState } from "@queenix/ui"
import { Mail, Phone, Activity, Calendar, Dumbbell, AlertCircle } from "@tamagui/lucide-icons"
import { Section, KeyValue, Stat } from "./primitives"
import { getRelative } from "./format"

export function ClientOverviewTab({
  member,
  profile,
  bookingsThisMonth,
  totalSpentLabel,
  lastSessionLabel,
}: {
  member: any
  profile: any
  bookingsThisMonth: number
  totalSpentLabel: string
  lastSessionLabel: string
}) {
  return (
    <YStack paddingHorizontal="$4" gap="$3">
      <XStack gap="$2">
        <Stat label="Sessions (mo)" value={bookingsThisMonth.toString()} flex={1} />
        <Stat label="Total spent" value={totalSpentLabel} flex={1} />
        <Stat label="Last session" value={lastSessionLabel} flex={1} />
      </XStack>

      <Section title="Contact">
        <KeyValue icon={<Mail size={16} color="$textSecondary" />} label="Email" value={member.email} />
        {member.phone && (
          <>
            <Divider />
            <KeyValue icon={<Phone size={16} color="$textSecondary" />} label="Phone" value={member.phone} />
          </>
        )}
      </Section>

      {profile && (
        <Section title="Profile">
          {profile.goals && (
            <YStack>
              <Text variant="caption" color="muted">Goals</Text>
              <Text variant="body" color="primary">{profile.goals}</Text>
            </YStack>
          )}
        </Section>
      )}
    </YStack>
  )
}

export function ClientSessionsTab({ sessions }: { sessions: any[] }) {
  if (!sessions.length) {
    return (
      <YStack paddingHorizontal="$4">
        <EmptyState
          icon={<Dumbbell size={32} color="$textMuted" />}
          title="No sessions yet"
          message="Once you book a session with this client, it'll show up here."
        />
      </YStack>
    )
  }
  return (
    <YStack paddingHorizontal="$4" gap="$2">
      {sessions.map((s: any) => (
        <Card key={s._id} variant="outlined" padding="sm">
          <XStack alignItems="center" gap="$3">
            <YStack
              backgroundColor={s.status === "completed" ? "$success50" : "$warning50"}
              padding="$2.5"
              borderRadius="$md"
            >
              <Activity
                size={18}
                color={s.status === "completed" ? "$success500" : "$warning500"}
              />
            </YStack>
            <YStack flex={1}>
              <Text variant="bodySmall" weight="600">
                {new Date(s.scheduledAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Text variant="caption" color="muted">
                {s.durationMinutes} min · {s.status}
              </Text>
            </YStack>
            <Badge
              label={s.status}
              variant={s.status === "completed" ? "success" : "warning"}
              size="sm"
            />
          </XStack>
        </Card>
      ))}
    </YStack>
  )
}

export function ClientNotesTab({
  notes,
  onAdd,
}: {
  notes: any[]
  onAdd: () => void
}) {
  return (
    <YStack paddingHorizontal="$4" gap="$2">
      {notes.length === 0 ? (
        <YStack gap="$3" alignItems="center">
          <AlertCircle size={32} color="$textMuted" />
          <Text variant="body" color="muted" textAlign="center">
            No notes yet for this client.
          </Text>
          <Button label="Add first note" variant="primary" onPress={onAdd} />
        </YStack>
      ) : (
        notes.map((n: any) => (
          <Card key={n._id} variant="outlined" padding="sm">
            <YStack gap="$1">
              <XStack justifyContent="space-between">
                <Text variant="caption" color="muted">
                  {getRelative(n.createdAt)}
                </Text>
              </XStack>
              <Text variant="body">{n.note}</Text>
            </YStack>
          </Card>
        ))
      )}
    </YStack>
  )
}
