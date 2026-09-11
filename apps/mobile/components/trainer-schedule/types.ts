export type SlotType = "PT" | "Class" | "Free" | "Blocked"
export type ViewMode = "week" | "day"

export interface GridSlot {
  type: SlotType
  hour: number
  title?: string
}
