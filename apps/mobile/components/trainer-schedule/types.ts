export type SlotType = "PT" | "Class" | "Free" | "Blocked"
export type ViewMode = "week" | "day"

export interface GridSlot {
  day: number // 0..6 (Mon..Sun)
  hour: number // 6..21
  type: SlotType
  title?: string
  sessionId?: string
}
