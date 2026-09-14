/**
 * Booking screen types + pure helpers.
 */

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

export function categoryFromString(
  raw: string | undefined,
): Exclude<ClassCategory, "All"> {
  const valid: Exclude<ClassCategory, "All">[] = [
    "HIIT",
    "Yoga",
    "Strength",
    "Cardio",
    "Pilates",
  ]
  return (valid.find((c) => c === raw) ?? "HIIT")
}

export function levelFromString(raw: string | undefined): Level {
  return raw === "Intermediate" || raw === "Advanced" ? raw : "Beginner"
}

export function categoryStyle(
  category: Exclude<ClassCategory, "All">,
): { label: string; icon: string } {
  const styles: Record<Exclude<ClassCategory, "All">, { label: string; icon: string }> = {
    HIIT: { label: "HIIT", icon: "🔥" },
    Yoga: { label: "Yoga", icon: "🧘" },
    Strength: { label: "Strength", icon: "💪" },
    Cardio: { label: "Cardio", icon: "🏃" },
    Pilates: { label: "Pilates", icon: "🤸" },
  }
  return styles[category] ?? { label: "Class", icon: "📋" }
}
