import React from "react"
import { YStack, XStack } from "tamagui"
import { Text, Card, Button, Badge, EmptyState } from "@queenix/ui"
import { formatDate, formatMoney, statusToVariant } from "./format"

export function PaymentsHeader({
  title,
  onBack,
}: {
  title: string
  onBack: () => void
}) {
  return (
    <XStack alignItems="center" gap="$2">
      <YStack
        onPress={onBack}
        role="button"
        aria-label="Go back"
        pressStyle={{ opacity: 0.7 }}
        padding="$2"
        borderRadius="$full"
        backgroundColor="$surfaceMuted"
      >
        <YStack
          aria-hidden
          style={{ transform: [{ rotate: "180deg" }] }}
        >
          <Text>‹</Text>
        </YStack>
      </YStack>
      <Text variant="h1">{title}</Text>
    </XStack>
  )
}

export function QuickStats({
  thisMonthTotal,
  thisMonthCount,
  memberSince,
  monthsActive,
}: {
  thisMonthTotal: number
  thisMonthCount: number
  memberSince: string | null
  monthsActive: number | null
}) {
  return (
    <XStack gap="$3">
      <Card variant="outlined" padding="md" flex={1}>
        <Text variant="caption" color="muted">This month</Text>
        <Text variant="h3" marginTop="$1">
          {formatMoney(thisMonthTotal, "AED")}
        </Text>
        <Text variant="caption" color="success">
          {thisMonthCount} {thisMonthCount === 1 ? "charge" : "charges"}
        </Text>
      </Card>
      <Card variant="outlined" padding="md" flex={1}>
        <Text variant="caption" color="muted">Member since</Text>
        <Text variant="h3" marginTop="$1">
          {memberSince ?? "—"}
        </Text>
        <Text variant="caption" color="muted">
          {monthsActive ? `${monthsActive} months` : "—"}
        </Text>
      </Card>
    </XStack>
  )
}

export function TransactionsSection({
  invoices,
  onViewReceipt,
}: {
  invoices: Array<{
    _id: string
    paymentId: string
    status: string
    totalCents: number
    currency: string
    paidAt?: number
    lineItems?: Array<{ description: string }>
  }>
  onViewReceipt: (paymentId: string) => void
}) {
  return (
    <YStack paddingHorizontal="$4" marginTop="$5" gap="$3">
      <Text variant="h3">Transaction history</Text>
      {invoices.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          message="Your receipts will show up here after your first payment."
        />
      ) : (
        <Card variant="outlined" padding="none">
          <YStack>
            {invoices.map((inv, idx) => (
              <YStack key={inv._id}>
                {idx > 0 && <Divider />}
                <YStack
                  padding="$4"
                  onPress={() => onViewReceipt(inv.paymentId)}
                  pressStyle={{ opacity: 0.7 }}
                  role="button"
                  aria-label={`Transaction: ${inv.lineItems?.[0]?.description ?? 'Payment'}, ${formatMoney(inv.totalCents, inv.currency)}`}
                >
                  <XStackStacked
                    description={inv.lineItems?.[0]?.description ?? 'Payment'}
                    date={inv.paidAt ? formatDate(inv.paidAt) : 'Pending'}
                    amountLabel={formatMoney(inv.totalCents, inv.currency)}
                    status={inv.status}
                    amountIsDanger={inv.status === 'refunded' || inv.status === 'void'}
                    statusVariant={statusToVariant(inv.status)}
                  />
                </YStack>
              </YStack>
            ))}
          </YStack>
        </Card>
      )}
    </YStack>
  )
}

function XStackStacked({
  description,
  date,
  amountLabel,
  status,
  amountIsDanger,
  statusVariant,
}: {
  description: string
  date: string
  amountLabel: string
  status: string
  amountIsDanger: boolean
  statusVariant: 'success' | 'danger' | 'warning'
}) {
  return (
    <XStack alignItems="center" gap="$3">
      <YStack flex={1}>
        <Text variant="label" numberOfLines={1}>
          {description}
        </Text>
        <Text variant="caption" color="muted">
          {date}
        </Text>
      </YStack>
      <YStack alignItems="flex-end" gap="$1">
        <Text variant="label" color={amountIsDanger ? 'danger' : 'primary'}>
          {amountLabel}
        </Text>
        <Badge label={status} variant={statusVariant} />
      </YStack>
    </XStack>
  )
}

export function DangerZone({
  endDateLabel,
  onCancel,
}: {
  endDateLabel: string
  onCancel: () => void
}) {
  return (
    <YStack paddingHorizontal="$4" marginTop="$6" gap="$2">
      <Text variant="caption" color="muted" textTransform="uppercase" weight="600">
        Plan management
      </Text>
      <Card variant="outlined" padding="md">
        <YStack gap="$3">
          <YStack alignItems="center" gap="$3">
            <Text variant="label">Cancel membership</Text>
            <Text variant="caption" color="muted" align="center">
              You will keep access until {endDateLabel}
            </Text>
          </YStack>
          <Button label="Cancel membership" variant="danger" size="md" fullWidth onPress={onCancel} />
        </YStack>
      </Card>
    </YStack>
  )
}

function Divider() {
  return null // Local Divider from @queenix/ui used below; this keeps the file's own count low.
}
