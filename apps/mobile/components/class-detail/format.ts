import React from "react"

type ClassCategory = "HIIT" | "Yoga" | "Strength" | "Cardio" | "Pilates"
type Level = "Beginner" | "Intermediate" | "Advanced"

export function categoryFromString(raw: string | undefined): ClassCategory {
  const allowed: ClassCategory[] = ["HIIT", "Yoga", "Strength", "Cardio", "Pilates"]
  if ((allowed as string[]).includes(raw ?? "")) return raw as ClassCategory
  return "Yoga"
}

export function levelFromString(raw: string | undefined): Level {
  if (raw === "beginner") return "Beginner"
  if (raw === "advanced") return "Advanced"
  return "Intermediate"
}

export function formatDay(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow"
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

export function formatHour(ts: number): string {
  const d = new Date(ts)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  const hh = h % 12 || 12
  return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`
}

export function makeIdempotencyKey(): string {
  return `bk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
