export const CURRENCY = "AED"

export function formatMoney(cents: number, currency: string = CURRENCY): string {
  return `${currency} ${(cents / 100).toFixed(2)}`
}

export function formatMoneyShort(cents: number): string {
  if (cents >= 1000) return `${(cents / 1000).toFixed(1)}k`
  return cents.toString()
}

export function getMonthLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })
}
