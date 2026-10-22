import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text, Divider, Badge, EmptyState } from "@queenix/ui"
import { Mail, Phone, Calendar, Car, AlertCircle, CreditCard, FileText } from "@tamagui/lucide-icons-2"
import { Section, KeyValue } from "./primitives"
import { formatCents } from "./format"

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

export function PaymentsTab({ payments }: { payments: any[] }) {
  return (
    <YStack paddingHorizontal="$4" gap="$2">
      <Text variant="h4">Recent payments</Text>
      {payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={32} color="$textMuted" />}
          title="No payments yet"
          message="Payment history will appear here."
        />
      ) : (
        payments.map((p: any) => (
          <Card key={p._id} variant="outlined" padding="sm">
            <XStack alignItems="center" gap="$3">
              <YStack
                backgroundColor={
                  p.status === 'succeeded'
                    ? '$success50'
                    : p.status === 'refunded'
                      ? '$info50'
                      : p.status === 'failed'
                        ? '$danger50'
                        : '$warning50'
                }
                padding="$2.5"
                borderRadius="$md"
              >
                <CreditCard
                  size={18}
                  color={
                    p.status === 'succeeded'
                      ? '$success500'
                      : p.status === 'refunded'
                        ? '$info500'
                        : p.status === 'failed'
                          ? '$danger500'
                          : '$warning500'
                  }
                />
              </YStack>
              <YStack flex={1}>
                <Text variant="bodySmall" weight="600">
                  {p.description ?? p.type}
                </Text>
                <Text variant="caption" color="muted">
                  {new Date(p.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </YStack>
              <YStack alignItems="flex-end">
                <Text
                  variant="label"
                  color={p.status === 'refunded' ? 'muted' : 'primary'}
                >
                  {formatCents(p.amountCents, p.currency)}
                </Text>
                <Badge
                  label={p.status}
                  variant={
                    p.status === 'succeeded'
                      ? 'success'
                      : p.status === 'refunded'
                        ? 'info'
                        : p.status === 'failed'
                          ? 'danger'
                          : 'warning'
                  }
                  size="sm"
                />
              </YStack>
            </XStack>
          </Card>
        ))
      )}
    </YStack>
  );
}

export function NotesTab({ notes }: { notes: any[] }) {
  return (
    <YStack paddingHorizontal="$4" gap="$2">
      {notes.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} color="$textMuted" />}
          title="No notes"
          message="No trainer notes for this member yet."
        />
      ) : (
        notes.map((n: any) => (
          <Card key={n._id} variant="outlined" padding="sm">
            <XStack alignItems="flex-start" gap="$2">
              <FileText size={16} color="$textMuted" />
              <YStack flex={1} gap="$0.5">
                <Text variant="caption" color="muted">
                  {new Date(n.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {n.note}
                </Text>
              </YStack>
            </XStack>
          </Card>
        ))
      )}
      <Text variant="caption" color="muted" align="center">
        Notes are written by trainers and shown here read-only.
      </Text>
    </YStack>
  );
}
