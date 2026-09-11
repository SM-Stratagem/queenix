import React from "react"
import { XStack, YStack } from "tamagui"
import { Card, Text, Avatar, Badge } from "@queenix/ui"
import { ChevronRight, Clock, Ticket as TicketIcon } from "@tamagui/lucide-icons"

export type Priority = "low" | "medium" | "high" | "critical"

export type Ticket = {
  id?: string
  ticketCode: string
  memberName: string
  memberInitials?: string
  category: string
  priority: Priority
  subject: string
  timeAgo: string
  status: "open" | "in_progress" | "waiting" | "resolved"
}

const PRIORITY_VARIANT: Record<Priority, "success" | "info" | "warning" | "danger"> = {
  low: "success",
  medium: "info",
  high: "warning",
  critical: "danger",
}

const STATUS_LABEL: Record<Ticket["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  waiting: "Waiting on member",
  resolved: "Resolved",
}

export function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <Card
      variant="outlined"
      padding="sm"
      accessibilityLabel={`Ticket ${ticket.ticketCode}, ${ticket.priority} priority, ${STATUS_LABEL[ticket.status]}`}
    >
      <XStack alignItems="flex-start" gap="$3">
        <Avatar name={ticket.memberName} size="md" fallbackColor="$info" />
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2" flexWrap="wrap">
            <Text variant="caption" weight="600" color="brand">
              {ticket.ticketCode}
            </Text>
            <Badge label={ticket.category} variant="neutral" />
            <Badge label={ticket.priority} variant={PRIORITY_VARIANT[ticket.priority]} />
          </XStack>
          <Text variant="label" numberOfLines={2}>
            {ticket.subject}
          </Text>
          <XStack alignItems="center" gap="$2">
            <Text variant="caption" color="muted">
              {ticket.memberName}
            </Text>
            <Text variant="caption" color="muted">
              •
            </Text>
            <XStack alignItems="center" gap="$1">
              <Clock size={12} color="$textMuted" />
              <Text variant="caption" color="muted">
                {ticket.timeAgo}
              </Text>
            </XStack>
          </XStack>
          <XStack alignItems="center" gap="$1" marginTop="$0.5">
            <TicketIcon size={12} color="$textMuted" />
            <Text variant="caption" color="secondary" weight="500">
              {STATUS_LABEL[ticket.status]}
            </Text>
          </XStack>
        </YStack>
        <ChevronRight size={18} color="$textMuted" />
      </XStack>
    </Card>
  )
}
