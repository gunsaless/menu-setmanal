import { describe, it, expect } from 'vitest'
import { seasonForDate } from './season'
import { generateMenu } from './generate'
import { buildGroceryList } from './grocery'
import type { AttendanceDay } from './types'

describe('seasonForDate', () => {
  it('maps dates to seasons including winter wrap', () => {
    expect(seasonForDate('2026-01-10')).toBe('hivern')
    expect(seasonForDate('2025-07-20')).toBe('estiu')
    expect(seasonForDate('2025-09-20')).toBe('final-estiu')
    expect(seasonForDate('2025-11-05')).toBe('tardor')
  })
})

const week = (): AttendanceDay[] =>
  Array.from({ length: 7 }, (_, i) => ({
    date: `2025-07-${String(14 + i).padStart(2, '0')}`,
    dinar: ['adria', 'helena'],
    sopar: ['adria', 'helena'],
  }))

describe('generateMenu', () => {
  it('fills every meal with a starter and a main in summer', () => {
    const menu = generateMenu(week())
    expect(menu.season).toBe('estiu')
    expect(menu.days).toHaveLength(7)
    for (const d of menu.days) {
      expect(d.dinar.primerId).toBeTruthy()
      expect(d.dinar.segonId).toBeTruthy()
      expect(d.sopar.primerId).toBeTruthy()
      expect(d.sopar.segonId).toBeTruthy()
      // starter and main must be different dishes
      expect(d.dinar.primerId).not.toBe(d.dinar.segonId)
      expect(d.sopar.primerId).not.toBe(d.sopar.segonId)
    }
  })

  it('skips a meal when nobody eats at home', () => {
    const att = week()
    att[0].sopar = []
    const menu = generateMenu(att)
    expect(menu.days[0].sopar.primerId).toBeNull()
    expect(menu.days[0].sopar.segonId).toBeNull()
  })
})

describe('buildGroceryList', () => {
  it('scales quantities by number of attendees', () => {
    const att = week()
    const menu = generateMenu(att)
    const list = buildGroceryList(menu)
    const total = Object.values(list).flat().length
    expect(total).toBeGreaterThan(0)
  })
})
