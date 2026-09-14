export type SessionStatus = "completed" | "active" | "upcoming"

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export function getStatusVariant(
  status: SessionStatus,
): "success" | "brand" | "neutral" {
  if (status === "completed") return "success"
  if (status === "active") return "brand"
  return "neutral"
}

export function getStatusLabel(status: SessionStatus): string {
  if (status === "completed") return "Completed"
  if (status === "active") return "In progress"
  return "Upcoming"
}

export function deriveStatus(
  scheduledAt: number,
  durationMinutes: number,
  dbStatus: string,
): SessionStatus {
  if (dbStatus === "cancelled") return "completed" // greyed out as done
  const now = Date.now()
  const end = scheduledAt + durationMinutes * 60_000
  if (now >= end) return "completed"
  if (now >= scheduledAt) return "active"
  return "upcoming"
}
