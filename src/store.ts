import { create } from 'zustand'
import type { AttendanceDay, Course, Person, PersonInfo, Slot, WeeklyMenu } from './core/types'
import { DEFAULT_PEOPLE, MAX_PEOPLE, MIN_PEOPLE } from './core/types'
import { generateMenu, rerollMeal } from './core/generate'
import { fixRule } from './core/nutrition'

const PEOPLE_KEY = 'menu-people'

function loadPeople(): PersonInfo[] {
  try {
    const raw = localStorage.getItem(PEOPLE_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length >= MIN_PEOPLE && arr.length <= MAX_PEOPLE &&
          arr.every((p) => p && p.id && p.name)) {
        return arr.map((p) => ({ id: String(p.id), name: String(p.name) }))
      }
    }
    // Migrate the old two-name format if present.
    const old = localStorage.getItem('menu-names')
    if (old) {
      const o = JSON.parse(old)
      return [
        { id: 'adria', name: o.adria || 'Adrià' },
        { id: 'helena', name: o.helena || 'Helena' },
      ]
    }
  } catch {
    /* ignore unavailable/corrupt storage */
  }
  return DEFAULT_PEOPLE.map((p) => ({ ...p }))
}

function savePeople(people: PersonInfo[]) {
  try {
    localStorage.setItem(PEOPLE_KEY, JSON.stringify(people))
  } catch {
    /* ignore unavailable storage */
  }
}

function newId(): string {
  return 'p-' + Math.random().toString(36).slice(2, 9)
}

const THEME_KEY = 'menu-theme'

function loadTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    /* ignore */
  }
  return 'light'
}

function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

interface State {
  attendance: AttendanceDay[]
  menu: WeeklyMenu | null
  rerollSeed: number
  /** Keys of grocery items the user already has (excluded from the export). */
  checkedGrocery: Set<string>
  /** The people (1–4), editable; persisted to localStorage. */
  people: PersonInfo[]
  /** Colour theme; persisted to localStorage. */
  theme: 'light' | 'dark'
  toggleTheme: () => void
  setRange: (startISO: string, days: number) => void
  toggleAttendee: (date: string, slot: Slot, person: Person) => void
  generate: () => void
  reroll: (date: string, slot: Slot, course: Course) => void
  toggleGrocery: (key: string) => void
  renamePerson: (person: Person, name: string) => void
  addPerson: () => void
  removePerson: (person: Person) => void
  /** Manually set a specific dish for a meal's course (from the picker). */
  setDish: (date: string, slot: Slot, course: Course, dishId: string) => void
  /** Resolve a nutritional alert by swapping dishes in the current menu. */
  fixNutrition: (ruleId: string) => void
}

function buildRange(startISO: string, days: number, ids: Person[]): AttendanceDay[] {
  const [y, m, d] = startISO.split('-').map(Number)
  const out: AttendanceDay[] = []
  for (let i = 0; i < days; i++) {
    const dt = new Date(y, m - 1, d + i)
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    // Default: weekend (Sat/Sun) meals are eaten out; weekdays everyone at home.
    const dow = dt.getDay()
    const home: Person[] = dow === 0 || dow === 6 ? [] : [...ids]
    out.push({ date: iso, dinar: [...home], sopar: [...home] })
  }
  return out
}

const initialPeople = loadPeople()

export const useStore = create<State>((set) => ({
  attendance: buildRange(new Date().toISOString().slice(0, 10), 7, initialPeople.map((p) => p.id)),
  menu: null,
  rerollSeed: 1,
  checkedGrocery: new Set(),
  people: initialPeople,
  theme: loadTheme(),

  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(THEME_KEY, theme) } catch { /* ignore */ }
      return { theme }
    }),

  setRange: (startISO, days) =>
    set((s) => ({ attendance: buildRange(startISO, days, s.people.map((p) => p.id)), menu: null })),

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
  generate: () =>
    set((s) => ({ menu: generateMenu(s.attendance, undefined, s.people.length), checkedGrocery: new Set() })),

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

  renamePerson: (person, name) =>
    set((s) => {
      const people = s.people.map((p) => (p.id === person ? { ...p, name } : p))
      savePeople(people)
      return { people }
    }),

  addPerson: () =>
    set((s) => {
      if (s.people.length >= MAX_PEOPLE) return {}
      const id = newId()
      const people = [...s.people, { id, name: `Persona ${s.people.length + 1}` }]
      savePeople(people)
      // Add the newcomer to existing weekday meals (weekends stay "out").
      const attendance = s.attendance.map((d) => {
        const dow = weekdayOf(d.date)
        if (dow === 0 || dow === 6) return d
        return { ...d, dinar: [...d.dinar, id], sopar: [...d.sopar, id] }
      })
      return { people, attendance }
    }),

  removePerson: (person) =>
    set((s) => {
      if (s.people.length <= MIN_PEOPLE) return {}
      const people = s.people.filter((p) => p.id !== person)
      savePeople(people)
      const strip = (arr: Person[]) => arr.filter((p) => p !== person)
      const attendance = s.attendance.map((d) => ({
        ...d, dinar: strip(d.dinar), sopar: strip(d.sopar),
      }))
      const menu = s.menu && {
        ...s.menu,
        days: s.menu.days.map((d) => ({
          ...d,
          dinar: { ...d.dinar, attendees: strip(d.dinar.attendees) },
          sopar: { ...d.sopar, attendees: strip(d.sopar.attendees) },
        })),
      }
      return { people, attendance, menu: menu || null }
    }),

  setDish: (date, slot, course, dishId) =>
    set((s) => {
      if (!s.menu) return {}
      const field = course === 'primer' ? 'primerId' : 'segonId'
      const days = s.menu.days.map((d) =>
        d.date === date ? { ...d, [slot]: { ...d[slot], [field]: dishId } } : d,
      )
      return { menu: { ...s.menu, days } }
    }),

  fixNutrition: (ruleId) =>
    set((s) => (s.menu ? { menu: fixRule(s.menu, ruleId) } : {})),
}))
