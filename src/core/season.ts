import type { Season } from './types'
import seasons from '../data/seasons.json'

/** Resolve a date (ISO yyyy-mm-dd) to its season, handling year-wrap ranges. */
export function seasonForDate(iso: string): Season {
  const md = iso.slice(5) // "mm-dd"
  for (const r of seasons.ranges) {
    const inRange =
      r.from <= r.to
        ? md >= r.from && md <= r.to
        : md >= r.from || md <= r.to // wraps year end (e.g. winter)
    if (inRange) return r.season as Season
  }
  return 'estiu'
}

export const SEASON_LABELS: Record<Season, string> = {
  primavera: 'Primavera',
  estiu: 'Estiu',
  tardor: 'Tardor',
  hivern: 'Hivern',
}
