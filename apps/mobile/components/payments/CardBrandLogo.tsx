import React from "react"
import { Text } from "@queenix/ui"

export type Brand = "visa" | "mastercard" | "amex"

const STYLES: Record<Brand, { text: string; color: string }> = {
  visa: { text: "VISA", color: "$brand" },
  mastercard: { text: "MC", color: "$warning" },
  amex: { text: "AMEX", color: "$info700" },
}

export function CardBrandLogo({ brand }: { brand: Brand }) {
  const s = STYLES[brand]
  return (
    <Text variant="caption" color={s.color as any} weight="800">
      {s.text}
    </Text>
  )
}
