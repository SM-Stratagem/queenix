export function getMonday(offsetWeeks: number): Date {
  const today = new Date()
  const dow = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - dow + offsetWeeks * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function getWeekRange(offsetWeeks: number): string {
  const monday = getMonday(offsetWeeks)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

export function getDayNumbers(offsetWeeks: number): number[] {
  const monday = getMonday(offsetWeeks)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.getDate()
  })
}
