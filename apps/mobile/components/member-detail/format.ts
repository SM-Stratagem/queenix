/**
 * Format helpers for client/member detail screens.
 */

export function formatCents(cents: number, currency = "AED"): string {
  return `${currency} ${(cents / 100).toFixed(2)}`
}

