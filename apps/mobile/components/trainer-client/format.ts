/**
 * Format helpers for client/member detail screens.
 */

export function formatCents(cents: number, currency = "AED"): string {
  return `${currency} ${(cents / 100).toFixed(2)}`
}

export function getRelative(ts: number): string {
  const diff = Date.now() - ts
  const abs = Math.abs(diff)
  const future = diff < 0
  const minutes = Math.floor(abs / (60 * 1000))
  const hours = Math.floor(abs / (60 * 60 * 1000))
  const days = Math.floor(abs / (24 * 60 * 60 * 1000))

  if (minutes < 1) return future ? "in a moment" : "just now"
  if (minutes < 60) return future ? `in ${minutes}m` : `${minutes}m ago`
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`
  if (days === 1) return future ? "tomorrow" : "yesterday"
  if (days < 7) return future ? `in ${days} days` : `${days} days ago`
  if (days < 14) return future ? "in 1 week" : "1 week ago"
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
}
