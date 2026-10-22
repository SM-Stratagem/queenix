/**
 * Rewards format + tier helpers.
 */

export type Tier = "Silver" | "Gold" | "Platinum"

export const TIER_THRESHOLDS = { Silver: 0, Gold: 1000, Platinum: 5000 } as const

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function tierForBalance(balance: number): Tier {
  if (balance >= TIER_THRESHOLDS.Platinum) return "Platinum"
  if (balance >= TIER_THRESHOLDS.Gold) return "Gold"
  return "Silver"
}

