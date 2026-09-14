import React from "react"
import { YStack, XStack } from "tamagui"
import { Text, Card, Button, Badge, Divider } from "@queenix/ui"
import { ChevronRight, Crown, Pause, Play, Sparkles } from "@tamagui/lucide-icons"
import { PlanBenefit } from "./PlanBenefit"
import { formatDate, formatMoney } from "./format"

export type MembershipView = {
  _id: string
  status: string
  startDate: number
  endDate: number
  plan?: {
    name?: string
    priceCents?: number
    currency?: string
    features?: string[]
  }
}

export function CurrentPlanCard({
  membership,
  onChangePlan,
  onFreeze,
  onUnfreeze,
}: {
  membership: MembershipView | null
  onChangePlan: () => void
  onFreeze: () => void
  onUnfreeze: () => void
}) {
  if (!membership) {
    return (
      <Card variant="elevated" padding="lg">
        <YStack gap="$3" alignItems="center">
          <Text variant="h3">No active membership</Text>
          <Text variant="bodySmall" color="secondary" align="center">
            Choose a plan to start training with us.
          </Text>
          <Button label="View plans" variant="primary" onPress={onChangePlan} />
        </YStack>
      </Card>
    )
  }

  const plan = membership.plan
  const status = membership.status as "active" | "frozen" | "cancelled"

  return (
    <Card variant="elevated" padding="lg">
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack gap="$1">
            <XStack alignItems="center" gap="$2">
              <Crown size={16} color="$brand" />
              <Text variant="caption" color="brand" weight="700" textTransform="uppercase">
                {plan?.name ?? "Active"}
              </Text>
            </XStack>
            <Text variant="h2">
              {formatMoney(plan?.priceCents ?? 0, plan?.currency ?? "AED")}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {status === "frozen"
                ? `Frozen until ${formatDate(membership.endDate)}`
                : `renews ${formatDate(membership.endDate)}`}
            </Text>
          </YStack>
          <Badge
            label={status}
            variant={
              status === "active" ? "success" : status === "frozen" ? "warning" : "danger"
            }
          />
        </XStack>

        <Divider />

        <YStack gap="$2">
          {(plan?.features ?? []).map((f, i) => (
            <PlanBenefit key={i} text={f} />
          ))}
        </YStack>

        <XStack gap="$2" marginTop="$2">
          <Button label="Change plan" variant="outline" size="sm" onPress={onChangePlan} />
          {status === "active" ? (
            <Button
              label="Pause"
              variant="secondary"
              size="sm"
              icon={<Pause size={14} color="$textPrimary" />}
              onPress={onFreeze}
            />
          ) : status === "frozen" ? (
            <Button
              label="Resume"
              variant="secondary"
              size="sm"
              icon={<Play size={14} color="$textPrimary" />}
              onPress={onUnfreeze}
            />
          ) : null}
        </XStack>
      </YStack>
    </Card>
  )
}
