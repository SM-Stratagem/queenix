import React from "react"
import { XStack, YStack } from "tamagui"
import { Card, Text, Avatar, Badge } from "@queenix/ui"
import {
  Crown,
  Sparkles,
  MessageSquare,
  Phone,
} from "@tamagui/lucide-icons"

export type MemberStatus = "active" | "frozen" | "lapsed"
export type Tier = "Premium" | "Elite" | "Standard"

export type Member = {
  name: string
  tier: Tier
  visits: number
  lastVisit: string
  status: MemberStatus
}

const STATUS_VARIANT: Record<MemberStatus, "success" | "info" | "neutral"> = {
  active: "success",
  frozen: "info",
  lapsed: "neutral",
}

export function MemberRow({ member }: { member: Member }) {
  const tierIcon =
    member.tier === "Elite" ? (
      <Crown size={12} color="$brand" />
    ) : (
      <Sparkles size={12} color="$textMuted" />
    )
  return (
    <Card
      variant="outlined"
      padding="sm"
      accessibilityLabel={`${member.name}, ${member.tier}, last visit ${member.lastVisit}`}
    >
      <XStack alignItems="center" gap="$3">
        <Avatar name={member.name} size="md" fallbackColor="$brand" />
        <YStack flex={1} gap="$0.5">
          <Text variant="label" numberOfLines={1}>
            {member.name}
          </Text>
          <XStack alignItems="center" gap="$1.5">
            {tierIcon}
            <Text variant="caption" color="secondary">
              {member.tier} • {member.visits} visits
            </Text>
          </XStack>
          <Text variant="caption" color="muted">
            Last visit {member.lastVisit}
          </Text>
        </YStack>
        <YStack alignItems="flex-end" gap="$1">
          <Badge label={member.status} variant={STATUS_VARIANT[member.status]} />
          <XStack gap="$2">
            <YStack
              onPress={() => {}}
              padding="$1.5"
              borderRadius="$full"
              backgroundColor="$surfaceMuted"
              accessibilityLabel={`Message ${member.name}`}
            >
              <MessageSquare size={14} color="$textPrimary" />
            </YStack>
            <YStack
              onPress={() => {}}
              padding="$1.5"
              borderRadius="$full"
              backgroundColor="$surfaceMuted"
              accessibilityLabel={`Call ${member.name}`}
            >
              <Phone size={14} color="$textPrimary" />
            </YStack>
          </XStack>
        </YStack>
      </XStack>
    </Card>
  )
}
