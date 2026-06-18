import { create } from 'zustand'
import type { AttendanceDay, Course, Person, Slot, WeeklyMenu } from './core/types'
import { generateMenu, rerollMeal } from './core/generate'

interface State {
  attendance: AttendanceDay[]
  menu: WeeklyMenu | null
  rerollSeed: number
  setRange: (startISO: string, days: number) => void
  toggleAttendee: (date: string, slot: Slot, person: Person) => void
  generate: () => void
  reroll: (date: string, slot: Slot, course: Course) => void
}

function buildRange(startISO: string, days: number): AttendanceDay[] {
  const [y, m, d] = startISO.split('-').map(Number)
  const out: AttendanceDay[] = []
  for (let i = 0; i < days; i++) {
    const dt = new Date(y, m - 1, d + i)
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    out.push({ date: iso, dinar: ['adria', 'helena'], sopar: ['adria', 'helena'] })
  }
  return out
}

export const useStore = create<State>((set, get) => ({
  attendance: buildRange(new Date().toISOString().slice(0, 10), 7),
  menu: null,
  rerollSeed: 1,

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

  generate: () => set({ menu: generateMenu(get().attendance) }),

  reroll: (date, slot, course) =>
    set((s) => {
      if (!s.menu) return {}
      const seed = s.rerollSeed + 1
      return { menu: rerollMeal(s.menu, date, slot, course, seed), rerollSeed: seed }
    }),
}))
