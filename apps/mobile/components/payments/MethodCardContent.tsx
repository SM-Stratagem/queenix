import React from "react"
import { YStack } from "tamagui"
import { Text } from "@queenix/ui"
import { CardBrandLogo, type Brand as BrandType } from "./CardBrandLogo"

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
        <CardBrandLogo brand={brand} />
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
