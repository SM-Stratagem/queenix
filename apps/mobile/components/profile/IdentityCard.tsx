import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text, Avatar, Badge, Divider } from "@queenix/ui"
import { Mail, Phone, IdCard } from "@tamagui/lucide-icons"
import { ContactRow } from "./ContactRow"

export type ProfileIdentity = {
  fullName: string
  email: string
  phone?: string
  employeeSince?: string
  employeeId: string
  avatarUrl?: string | null
  roles: string[]
  primaryRole: string
  secondaryRole?: string
}

export function IdentityCard({ identity }: { identity: ProfileIdentity }) {
  return (
    <YStack paddingHorizontal="$4" marginTop="$2">
      <Card variant="elevated" padding="lg">
        <XStack alignItems="center" gap="$3">
          <Avatar
            name={identity.fullName}
            size="xl"
            src={identity.avatarUrl ?? undefined}
            fallbackColor="$brand"
          />
          <YStack flex={1} gap="$1">
            <Text variant="h2" numberOfLines={1}>
              {identity.fullName}
            </Text>
            <XStack alignItems="center" gap="$2" flexWrap="wrap">
              <Badge label={identity.primaryRole} variant="info" />
              {identity.secondaryRole ? (
                <Badge label={identity.secondaryRole} variant="neutral" />
              ) : null}
            </XStack>
            <Text variant="caption" color="muted">
              ID OPS-{identity.employeeId}
            </Text>
          </YStack>
        </XStack>
        <Divider marginVertical="$3" />
        <YStack gap="$2">
          <ContactRow
            icon={<Mail size={14} color="$textMuted" />}
            label="Email"
            value={identity.email}
          />
          <ContactRow
            icon={<Phone size={14} color="$textMuted" />}
            label="Phone"
            value={identity.phone ?? ""}
          />
          <ContactRow
            icon={<IdCard size={14} color="$textMuted" />}
            label="Employee since"
            value={identity.employeeSince ?? ""}
          />
        </YStack>
      </Card>
    </YStack>
  )
}
