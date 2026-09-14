export function getInitials(name?: string | null): string {
  if (!name) return "·"
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")
}

export function formatRelative(ms: number): string {
  const d = Date.now() - ms
  if (d < 60_000) return `${Math.max(1, Math.floor(d / 1000))}s ago`
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} min ago`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`
  return `${Math.floor(d / 86_400_000)}d ago`
}
