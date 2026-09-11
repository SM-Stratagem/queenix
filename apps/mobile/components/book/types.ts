export type Level = "Beginner" | "Intermediate" | "Advanced"
export type ClassCategory =
  | "All"
  | "HIIT"
  | "Yoga"
  | "Strength"
  | "Cardio"
  | "Pilates"

export interface ClassView {
  id: string
  name: string
  category: ClassCategory
  level: Level
  room: string
  icon: React.ReactNode
  hue: string
  startsAt: number
  durationMin: number
  bookedCount: number
  capacity: number
  trainerName?: string
}

export interface TrainerView {
  id: string
  name: string
  specialty: string
  bio?: string
  rating: number
  reviewCount: number
  hourlyRate: number
}

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
