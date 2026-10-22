/**
 * UI status of a PT session. ptSessions only stores scheduled/completed/
 * cancelled/no_show, so "active" (started) and "overdue" (ended but never
 * closed) are derived here; a terminal DB status always wins over the clock.
 */
export type SessionStatus =
  | "upcoming"
  | "active"
  | "overdue"
  | "completed"
  | "cancelled"
  | "no_show"

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
): "success" | "brand" | "neutral" | "warning" | "danger" {
  if (status === "completed") return "success"
  if (status === "active") return "brand"
  if (status === "overdue") return "warning"
  if (status === "cancelled" || status === "no_show") return "danger"
  return "neutral"
}

const LABELS: Record<SessionStatus, string> = {
  upcoming: "Upcoming",
  active: "In progress",
  overdue: "Needs closing",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
}

export function getStatusLabel(status: SessionStatus): string {
  return LABELS[status]
}

/** `started` = the trainer tapped Start on this device (no server state for it). */
export function deriveStatus(
  scheduledAt: number,
  durationMinutes: number,
  dbStatus: string,
  started = false,
  now = Date.now(),
): SessionStatus {
  if (dbStatus === "completed" || dbStatus === "cancelled" || dbStatus === "no_show") return dbStatus
  const end = scheduledAt + durationMinutes * 60_000
  if (now >= end) return "overdue"
  if (started || now >= scheduledAt) return "active"
  return "upcoming"
}
