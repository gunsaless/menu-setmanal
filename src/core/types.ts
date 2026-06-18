// ─── Domain types ───────────────────────────────────────────────────────────
// These describe the editable database (src/data/*.json) and the generated menu.

export type Season = 'primavera' | 'estiu' | 'tardor' | 'hivern'

/** Meal slots that the generator decides. Breakfast/snacks are fixed routines. */
export type Slot = 'dinar' | 'sopar'

/** Each meal has a starter (primer) and a main course (segon). */
export type Course = 'primer' | 'segon'

export const COURSES: Course[] = ['primer', 'segon']

/** Coarse tags used to balance variety across the week. */
export type Tag =
  | 'peix' | 'carn' | 'llegum' | 'ou' | 'crema' | 'amanida'
  | 'verdura' | 'vegetaria' | 'lliure'

/** A person id (e.g. 'adria', or a generated id for added people). */
export type Person = string

export interface PersonInfo {
  id: Person
  name: string
}

export const MIN_PEOPLE = 1
export const MAX_PEOPLE = 4

/** Default people; editable (rename / add / remove) in the UI. */
export const DEFAULT_PEOPLE: PersonInfo[] = [
  { id: 'adria', name: 'Adrià' },
  { id: 'helena', name: 'Helena' },
]

export interface Ingredient {
  item: string
  /** Quantity for `servingsBase` servings. Omit for "to taste" items. */
  qty?: number
  unit?: string // u, g, ml, grapat, cullerada, dent...
  category: GroceryCategory
  /** If false, qty is NOT multiplied by number of people (e.g. salt, oil). */
  scalable?: boolean
}

export type GroceryCategory =
  | 'verdura-fruita' | 'peix-carn' | 'lactics-ous' | 'llegums-cereals'
  | 'fruits-secs-llavors' | 'herbes-condiments' | 'altres'

export interface Dish {
  id: string
  name: string
  seasons: Season[]
  slots: Slot[]
  servingsBase: number
  /** Which course(s) this dish can serve as. A dish may work as both. */
  course: Course[]
  tags: Tag[]
  ingredients: Ingredient[]
  steps?: string[]
  /** A "lliure" / free-choice slot: shown but excluded from grocery list. */
  free?: boolean
}

/** Which dates and who eats each meal at home. */
export interface AttendanceDay {
  date: string // ISO yyyy-mm-dd
  dinar: Person[] // who eats this meal AT HOME
  sopar: Person[]
}

export interface PlannedMeal {
  slot: Slot
  attendees: Person[]
  /** Dish chosen for each course. null = nobody eats at home (meal skipped). */
  primerId: string | null
  segonId: string | null
}

export interface PlannedDay {
  date: string
  dinar: PlannedMeal
  sopar: PlannedMeal
}

export interface WeeklyMenu {
  season: Season
  days: PlannedDay[]
}
