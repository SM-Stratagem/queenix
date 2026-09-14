/**
 * Formatting helpers for the Payments screen.
 * Kept dependency-free so they can be unit-tested or reused elsewhere.
 */

export type Brand = "visa" | "mastercard" | "amex"

export const brandLabel: Record<Brand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
}

export function normalizeBrand(b?: string): Brand {
  const v = (b ?? "").toLowerCase()
  if (v.includes("master")) return "mastercard"
  if (v.includes("amex") || v.includes("american")) return "amex"
  return "visa"
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatMoney(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toFixed(2)}`
}

export function statusToVariant(
  s: string
): "success" | "danger" | "warning" {
  if (s === "succeeded" || s === "paid") return "success"
  if (s === "failed" || s === "cancelled" || s === "refunded" || s === "void") return "danger"
  return "warning"
}

export function startOfMonthMs(): number {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
