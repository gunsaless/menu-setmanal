import type {
  AttendanceDay, Course, Dish, PlannedDay, PlannedMeal, Season, Slot, WeeklyMenu,
} from './types'
import { poolFor, dishById } from './dishes'
import { seasonForDate } from './season'

/** All dish ids chosen across a planned week (used to avoid repeats). */
function chosenIds(days: PlannedDay[]): string[] {
  return days
    .flatMap((d) => [d.dinar.primerId, d.dinar.segonId, d.sopar.primerId, d.sopar.segonId])
    .filter(Boolean) as string[]
}

/** Deterministic-but-shuffled pick driven by a seed so reruns vary. */
function pickWeighted(
  pool: Dish[],
  usedIds: string[],
  recentTags: string[],
  seed: number,
): Dish | null {
  if (pool.length === 0) return null
  const scored = pool.map((d, i) => {
    let score = 1
    if (usedIds.includes(d.id)) score -= 0.8 // strongly avoid repeats
    // penalise repeating the same primary tag as recent days (variety)
    if (d.tags.some((t) => recentTags.includes(t))) score -= 0.3
    if (d.free) score -= 0.5 // keep "lliure" rare unless forced
    // pseudo-random jitter from seed so rerolls differ
    const jitter = (Math.sin((seed + i) * 12.9898) * 43758.5453) % 1
    return { d, score: score + Math.abs(jitter) * 0.5 }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0].d
}

function planMeal(
  slot: Slot,
  attendees: ('adria' | 'helena')[],
  season: Season,
  usedIds: string[],
  recentTags: string[],
  seed: number,
): PlannedMeal {
  if (attendees.length === 0) return { slot, attendees, primerId: null, segonId: null }
  const primer = pickWeighted(poolFor(season, slot, 'primer'), usedIds, recentTags, seed)
  // Exclude the just-picked starter so the main is a different dish.
  const segonUsed = primer ? [...usedIds, primer.id] : usedIds
  const segon = pickWeighted(poolFor(season, slot, 'segon'), segonUsed, recentTags, seed + 1)
  return { slot, attendees, primerId: primer?.id ?? null, segonId: segon?.id ?? null }
}

export function generateMenu(
  attendance: AttendanceDay[],
  // Base seed for the pseudo-random picks. Defaults to a random value so each
  // generation differs; pass an explicit seed when you need reproducibility (tests).
  baseSeed: number = Math.floor(Math.random() * 1e9),
): WeeklyMenu {
  const season = attendance.length ? seasonForDate(attendance[0].date) : 'estiu'
  const usedIds: string[] = []
  const days: PlannedDay[] = []
  let seed = baseSeed

  for (const day of attendance) {
    const recentTags = chosenIds(days.slice(-2)).flatMap(
      (id) => dishById(id)?.tags ?? [],
    )

    const dinar = planMeal('dinar', day.dinar, season, usedIds, recentTags, seed)
    seed += 2
    usedIds.push(...[dinar.primerId, dinar.segonId].filter(Boolean) as string[])
    const sopar = planMeal('sopar', day.sopar, season, usedIds, recentTags, seed)
    seed += 2
    usedIds.push(...[sopar.primerId, sopar.segonId].filter(Boolean) as string[])

    days.push({ date: day.date, dinar, sopar })
  }
  return { season, days }
}

/** Re-pick a single course of a single meal, avoiding dishes used that week. */
export function rerollMeal(
  menu: WeeklyMenu,
  date: string,
  slot: Slot,
  course: Course,
  seed: number,
): WeeklyMenu {
  const usedIds = chosenIds(menu.days)
  const field = course === 'primer' ? 'primerId' : 'segonId'

  const days = menu.days.map((d) => {
    if (d.date !== date) return d
    const meal = d[slot]
    if (meal.attendees.length === 0) return d
    const current = meal[field]
    const pool = poolFor(menu.season, slot, course).filter((x) => x.id !== current)
    const next = pool.length ? pickFromExcluding(pool, usedIds, seed) : null
    return { ...d, [slot]: { ...meal, [field]: next?.id ?? current } }
  })
  return { ...menu, days }
}

function pickFromExcluding(pool: Dish[], usedIds: string[], seed: number): Dish {
  const fresh = pool.filter((d) => !usedIds.includes(d.id))
  const candidates = fresh.length ? fresh : pool
  const idx = Math.floor(Math.abs(Math.sin(seed * 78.233) * 43758.5453) % 1 * candidates.length)
  return candidates[Math.min(idx, candidates.length - 1)]
}
