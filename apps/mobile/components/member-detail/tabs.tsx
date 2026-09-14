import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text, Divider, Badge, EmptyState } from "@queenix/ui"
import { Mail, Phone, Calendar, Car, AlertCircle } from "@tamagui/lucide-icons"
import { Section, KeyValue } from "./primitives"

export function OverviewTab({
  member,
  profile,
}: {
  member: any
  profile: any
}) {
  return (
    <YStack paddingHorizontal="$4" gap="$3">
      <Section title="Contact">
        <KeyValue
          icon={<Mail size={16} color="$textSecondary" />}
          label="Email"
          value={member.email}
        />
        {member.phone && (
          <>
            <Divider />
            <KeyValue
              icon={<Phone size={16} color="$textSecondary" />}
              label="Phone"
              value={member.phone}
            />
          </>
        )}
        <Divider />
        <KeyValue
          icon={<Calendar size={16} color="$textSecondary" />}
          label="Joined"
          value={new Date(member.createdAt).toLocaleDateString("en-GB")}
        />
      </Section>

      {profile?.emergencyContact && (
        <Section title="Emergency contact">
          <KeyValue
            icon={<AlertCircle size={16} color="$danger500" />}
            label={profile.emergencyContact.relationship ?? "Contact"}
            value={`${profile.emergencyContact.name} • ${profile.emergencyContact.phone}`}
          />
        </Section>
      )}

      {profile?.vehicles && profile.vehicles.length > 0 && (
        <Section title="Registered vehicles">
          <YStack gap="$1.5">
            {profile.vehicles.map((v: any, i: number) => (
              <XStack key={i} alignItems="center" gap="$2">
                <Car size={16} color="$textSecondary" />
                <Text variant="bodySmall" color="secondary" flex={1}>
                  {v.color ? `${v.color} ` : ""}
                  {v.make ? `${v.make} ` : ""}
                  {v.model ?? ""}
                </Text>
                <Badge label={v.plate} variant="neutral" size="sm" />
              </XStack>
            ))}
          </YStack>
        </Section>
      )}
    </YStack>
  )
}

export function ActivityTab({ visits }: { visits: any[] }) {
  if (visits.length === 0) {
    return (
      <YStack paddingHorizontal="$4" gap="$2">
        <Text variant="h4">Recent visits</Text>
        <EmptyState
          title="No recent activity"
          message="This member has not visited the gym recently."
        />
      </YStack>
    )
  }
  return (
    <YStack paddingHorizontal="$4" gap="$2">
      <Text variant="h4">Recent visits</Text>
      {visits.map((v: any) => (
        <Card key={v._id} variant="outlined" padding="sm">
          <XStack alignItems="center" gap="$3">
            <YStack
              backgroundColor={v.granted ? "$success50" : "$danger50"}
              padding="$2.5"
              borderRadius="$md"
            >
              <Text>{v.granted ? "In" : "Out"}</Text>
            </YStack>
            <YStack flex={1}>
              <Text variant="bodySmall" weight="600">
                {v.direction === "in" ? "Check-in" : "Check-out"}
                {v.accessPointId ? ` • ${v.accessPointId}` : ""}
              </Text>
              <Text variant="caption" color="muted">
                {new Date(v.timestamp).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {v.reason ? ` — ${v.reason}` : ""}
              </Text>
            </YStack>
            <Badge
              label={v.granted ? "Granted" : "Denied"}
              variant={v.granted ? "success" : "danger"}
              size="sm"
            />
          </XStack>
        </Card>
      ))}
    </YStack>
  )
}

export function MembershipTab({ memberships }: { memberships: any[] }) {
  if (memberships.length === 0) {
    return (
      <YStack paddingHorizontal="$4">
        <EmptyState
          title="No memberships"
          message="This member has no membership records."
        />
      </YStack>
    )
  }
  return (
    <YStack paddingHorizontal="$4" gap="$3">
      {memberships.map((m: any) => (
        <Card key={m._id} variant="outlined" padding="sm">
          <YStack gap="$2">
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack flex={1}>
                <Text variant="label">Membership</Text>
                <Text variant="caption" color="muted">
                  {new Date(m.startDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  –{" "}
                  {new Date(m.endDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </YStack>
              <Badge
                label={m.status}
                variant={
                  m.status === "active"
                    ? "success"
                    : m.status === "cancelled"
                      ? "danger"
                      : m.status === "frozen"
                        ? "warning"
                        : "neutral"
                }
              />
            </XStack>
            <XStack gap="$3">
              <YStack flex={1}>
                <Text variant="caption" color="muted">
                  Classes
                </Text>
                <Text variant="bodySmall" weight="600">
                  {m.remainingClasses}
                </Text>
              </YStack>
              <YStack flex={1}>
                <Text variant="caption" color="muted">
                  PT sessions
                </Text>
                <Text variant="bodySmall" weight="600">
                  {m.remainingPTSessions}
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </Card>
      ))}
    </YStack>
  )
}
