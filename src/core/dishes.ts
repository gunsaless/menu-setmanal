import type { Course, Dish, Season, Slot } from './types'
import raw from '../data/dishes.json'

export const ALL_DISHES = raw as Dish[]

export function dishById(id: string): Dish | undefined {
  return ALL_DISHES.find((d) => d.id === id)
}

/** Candidate dishes for a given season + slot, optionally restricted to a course. */
export function poolFor(season: Season, slot: Slot, course?: Course): Dish[] {
  return ALL_DISHES.filter(
    (d) =>
      d.seasons.includes(season) &&
      d.slots.includes(slot) &&
      (course ? d.course.includes(course) : true),
  )
}
