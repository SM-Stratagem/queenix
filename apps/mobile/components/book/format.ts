export function formatHour(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function makeIdempotencyKey(): string {
  return `book-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
