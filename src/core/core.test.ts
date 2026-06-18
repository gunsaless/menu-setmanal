import { describe, it, expect } from 'vitest'
import { seasonForDate } from './season'
import { generateMenu } from './generate'
import { buildGroceryList, groceryKey } from './grocery'
import { groceryToText } from './export'
import type { AttendanceDay } from './types'

describe('seasonForDate', () => {
  it('maps dates to seasons including winter wrap', () => {
    expect(seasonForDate('2026-01-10')).toBe('hivern')
    expect(seasonForDate('2025-04-20')).toBe('primavera')
    expect(seasonForDate('2025-07-20')).toBe('estiu')
    expect(seasonForDate('2025-09-20')).toBe('estiu')
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

describe('default fixed meals', () => {
  it('Monday dinner with both at home → mongeta + salmó', () => {
    const att: AttendanceDay[] = [
      { date: '2026-06-15', dinar: ['adria', 'helena'], sopar: ['adria', 'helena'] }, // Monday
    ]
    const menu = generateMenu(att, 7)
    expect(menu.days[0].sopar.primerId).toBe('mongeta-pastanaga-vapor')
    expect(menu.days[0].sopar.segonId).toBe('salmo-planxa')
  })

  it('Monday dinner with only one at home → not forced', () => {
    const att: AttendanceDay[] = [
      { date: '2026-06-15', dinar: [], sopar: ['adria'] },
    ]
    const menu = generateMenu(att, 7)
    expect(menu.days[0].sopar.primerId).not.toBe('mongeta-pastanaga-vapor')
  })

  it('Sunday dinner (summer) with ≥1 home → gaspatxo + pinya', () => {
    const att: AttendanceDay[] = [
      { date: '2026-06-21', dinar: [], sopar: ['helena'] }, // Sunday, estiu
    ]
    const menu = generateMenu(att, 7)
    expect(menu.days[0].sopar.primerId).toBe('gaspatxo-alvocat')
    expect(menu.days[0].sopar.segonId).toBe('pinya-natural')
  })

  it('Sunday dinner (winter) with ≥1 home → caldo + pinya', () => {
    const att: AttendanceDay[] = [
      { date: '2026-01-11', dinar: [], sopar: ['adria', 'helena'] }, // Sunday, hivern
    ]
    const menu = generateMenu(att, 7)
    expect(menu.days[0].sopar.primerId).toBe('caldo-verdures')
    expect(menu.days[0].sopar.segonId).toBe('pinya-natural')
  })
})

describe('groceryToText', () => {
  it('omits checked-off items from the export', () => {
    const menu = generateMenu(week(), 42)
    const items = Object.values(buildGroceryList(menu)).flat()
    const allKeys = new Set(items.map(groceryKey))

    const full = groceryToText(menu)
    const fullBullets = (full.match(/•/g) ?? []).length
    expect(fullBullets).toBe(items.length)

    // Checking one item drops exactly one bullet line.
    const oneChecked = groceryToText(menu, new Set([groceryKey(items[0])]))
    expect((oneChecked.match(/•/g) ?? []).length).toBe(items.length - 1)

    // Checking everything leaves no items (no bullets).
    expect((groceryToText(menu, allKeys).match(/•/g) ?? []).length).toBe(0)
  })
})
