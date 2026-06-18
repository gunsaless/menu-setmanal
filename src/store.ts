import { create } from 'zustand'
import type { AttendanceDay, Course, Person, Slot, WeeklyMenu } from './core/types'
import { generateMenu, rerollMeal } from './core/generate'

interface State {
  attendance: AttendanceDay[]
  menu: WeeklyMenu | null
  rerollSeed: number
  /** Keys of grocery items the user already has (excluded from the export). */
  checkedGrocery: Set<string>
  setRange: (startISO: string, days: number) => void
  toggleAttendee: (date: string, slot: Slot, person: Person) => void
  generate: () => void
  reroll: (date: string, slot: Slot, course: Course) => void
  toggleGrocery: (key: string) => void
}

function buildRange(startISO: string, days: number): AttendanceDay[] {
  const [y, m, d] = startISO.split('-').map(Number)
  const out: AttendanceDay[] = []
  for (let i = 0; i < days; i++) {
    const dt = new Date(y, m - 1, d + i)
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    // Default: weekend (Sat/Sun) meals are eaten out; weekdays both at home.
    const dow = dt.getDay()
    const home: Person[] = dow === 0 || dow === 6 ? [] : ['adria', 'helena']
    out.push({ date: iso, dinar: [...home], sopar: [...home] })
  }
  return out
}

export const useStore = create<State>((set, get) => ({
  attendance: buildRange(new Date().toISOString().slice(0, 10), 7),
  menu: null,
  rerollSeed: 1,
  checkedGrocery: new Set(),

  setRange: (startISO, days) => set({ attendance: buildRange(startISO, days), menu: null }),

  toggleAttendee: (date, slot, person) =>
    set((s) => ({
      attendance: s.attendance.map((d) => {
        if (d.date !== date) return d
        const has = d[slot].includes(person)
        return {
          ...d,
          [slot]: has ? d[slot].filter((p) => p !== person) : [...d[slot], person],
        }
      }),
    })),

  // A fresh menu starts with nothing checked off.
  generate: () => set({ menu: generateMenu(get().attendance), checkedGrocery: new Set() }),

  reroll: (date, slot, course) =>
    set((s) => {
      if (!s.menu) return {}
      const seed = s.rerollSeed + 1
      return { menu: rerollMeal(s.menu, date, slot, course, seed), rerollSeed: seed }
    }),

  toggleGrocery: (key) =>
    set((s) => {
      const next = new Set(s.checkedGrocery)
      next.has(key) ? next.delete(key) : next.add(key)
      return { checkedGrocery: next }
    }),
}))
