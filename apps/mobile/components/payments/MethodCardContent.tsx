import React from "react"
import { YStack, XStack } from "tamagui"
import { Text, Card } from "@queenix/ui"
import { Brand as BrandType } from "./CardBrandLogo"

export type PaymentMethod = {
  _id: string
  brand?: string
  type?: string
  provider?: string
  last4?: string | null
  expiryMonth?: number | null
  expiryYear?: number | null
  isDefault?: boolean
}

export function PaymentMethodCardContent({
  method,
  brand,
}: {
  method: PaymentMethod
  brand: BrandType
}) {
  const expiry =
    method.expiryMonth && method.expiryYear
      ? `Expires ${String(method.expiryMonth).padStart(2, "0")}/${String(method.expiryYear).slice(-2)}`
      : method.type === "apple_pay"
        ? "Apple Pay"
        : method.type === "google_pay"
          ? "Google Pay"
          : method.provider

  return (
    <>
      <YStack
        backgroundColor="$brand50"
        padding="$2.5"
        borderRadius="$md"
      >
        <CardBrandLogoText brand={brand} />
      </YStack>
      <YStack flex={1}>
        <Text variant="label">
          {brand.toUpperCase().slice(0, 4)} •••• {method.last4 ?? "****"}
        </Text>
        <Text variant="caption" color="muted">
          {expiry}
        </Text>
      </YStack>
    </>
  )
}

function CardBrandLogoText({ brand }: { brand: BrandType }) {
  const labels: Record<BrandType, string> = {
    visa: "VISA",
    mastercard: "MC",
    amex: "AMEX",
  }
  const colors: Record<BrandType, string> = {
    visa: "$brand",
    mastercard: "$warning",
    amex: "$info700",
  }
  return (
    <Text variant="caption" color={colors[brand] as any} weight="800">
      {labels[brand]}
    </Text>
  )
}
