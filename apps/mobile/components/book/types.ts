/**
 * Booking screen types.
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
  startsAt: number
  durationMin: number
  room: string
  capacity: number
  bookedCount: number
  waitlistCount: number
  trainerName?: string
  hue: string
  icon: React.ReactNode
  /** The signed-in member's live booking on this class, if any. */
  myStatus?: 'confirmed' | 'waitlisted'
}

export interface TrainerView {
  id: string
  name: string
  avatarUrl?: string
  specialty: string
  rating: number
  reviewCount: number
  hourlyRate: number
  bio?: string
  certifications: string[]
  years?: number
  nextAvailable?: string
}
