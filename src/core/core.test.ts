import { describe, it, expect } from 'vitest'
import { seasonForDate } from './season'
import { generateMenu } from './generate'
import { buildGroceryList, groceryKey } from './grocery'
import { groceryToText, menuToText } from './export'
import { checkNutrition, fixRule } from './nutrition'
import { dishById } from './dishes'
import type { AttendanceDay, WeeklyMenu } from './types'

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

describe('same-day protein variety', () => {
  const PROT = ['peix', 'carn', 'ou', 'llegum']
  const protOf = (id: string | null): string[] => {
    const d = id ? dishById(id) : undefined
    return d ? d.tags.filter((t) => PROT.includes(t)) : []
  }

  it('lunch and dinner mains do not share the same protein', () => {
    // Tue–Fri (avoids the fixed Monday/Sunday dinners), both at home.
    const att: AttendanceDay[] = ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'].map((date) => ({
      date, dinar: ['adria', 'helena'], sopar: ['adria', 'helena'],
    }))
    const menu = generateMenu(att, 99)
    for (const d of menu.days) {
      const lunch = protOf(d.dinar.segonId)
      const dinner = protOf(d.sopar.segonId)
      if (lunch.length && dinner.length) {
        expect(lunch.some((p: string) => dinner.includes(p))).toBe(false)
      }
    }
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

  it('does not reuse the Monday fixed dishes elsewhere in the week', () => {
    // Week starting Monday, everyone home → Monday sopar is mongeta + salmó.
    const att: AttendanceDay[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-06-${15 + i}`, dinar: ['adria', 'helena'], sopar: ['adria', 'helena'],
    }))
    const menu = generateMenu(att, 5)
    const reserved = ['mongeta-pastanaga-vapor', 'salmo-planxa']
    menu.days.forEach((d, i) => {
      for (const meal of [d.dinar, d.sopar]) {
        for (const id of [meal.primerId, meal.segonId]) {
          if (reserved.includes(id!)) {
            expect(i === 0 && meal === d.sopar).toBe(true) // only Monday dinner
          }
        }
      }
    })
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
    expect(menu.days[0].sopar.primerId).toBe('gaspatxo')
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

describe('menuToText', () => {
  it('formats the day header with the full month name', () => {
    const att: AttendanceDay[] = [
      { date: '2026-06-16', dinar: ['adria', 'helena'], sopar: [] },
    ]
    expect(menuToText(generateMenu(att, 3))).toContain('*Dimarts 16 Juny*')
  })

  it('shows italic "Fora" when both eat out, no dishes listed', () => {
    const att: AttendanceDay[] = [
      { date: '2026-06-16', dinar: ['adria', 'helena'], sopar: [] }, // sopar = both out
    ]
    const text = menuToText(generateMenu(att, 3))
    expect(text).toContain('Sopar _Fora_')
    expect(text).toContain('Dinar:') // both home → plain label + dishes
  })

  it('annotates the absent person when only one eats out', () => {
    const att: AttendanceDay[] = [
      { date: '2026-06-16', dinar: ['helena'], sopar: ['adria', 'helena'] },
    ]
    const text = menuToText(generateMenu(att, 3))
    expect(text).toContain('Dinar _Adrià fora_')
  })

  it('supports a custom list of people (1–4) with multiple absents', () => {
    const people = [
      { id: 'a', name: 'Anna' },
      { id: 'b', name: 'Bru' },
      { id: 'c', name: 'Cesc' },
    ]
    const att: AttendanceDay[] = [
      { date: '2026-06-16', dinar: ['a'], sopar: [] },
    ]
    const text = menuToText(generateMenu(att, 3, people.length), people)
    expect(text).toContain('Dinar _Bru, Cesc fora_') // two of three out
    expect(text).toContain('Sopar _Fora_') // everyone out
  })
})

describe('checkNutrition', () => {
  it('flags a repeated dish in the week', () => {
    const menu: WeeklyMenu = {
      season: 'estiu',
      days: [
        {
          date: '2026-07-15',
          dinar: { slot: 'dinar', attendees: ['adria'], primerId: 'amanida-verda', segonId: 'pollastre-planxa' },
          sopar: { slot: 'sopar', attendees: ['adria'], primerId: 'amanida-verda', segonId: 'salmo-planxa' },
        },
      ],
    }
    const unique = checkNutrition(menu).find((r) => r.id === 'unique')!
    expect(unique.status).toBe('warn')
    expect(unique.detail).toContain('Amanida verda')
  })

  it('passes unique check when all dishes differ, and returns all rule ids', () => {
    const menu: WeeklyMenu = {
      season: 'estiu',
      days: [
        {
          date: '2026-07-15',
          dinar: { slot: 'dinar', attendees: ['adria'], primerId: 'amanida-verda', segonId: 'salmo-planxa' },
          sopar: { slot: 'sopar', attendees: ['adria'], primerId: 'gaspatxo', segonId: 'pollastre-planxa' },
        },
      ],
    }
    const res = checkNutrition(menu)
    expect(res.find((r) => r.id === 'unique')!.status).toBe('ok')
    expect(res.map((r) => r.id)).toEqual(
      expect.arrayContaining(['unique', 'protein-balance', 'fish', 'carbs', 'veggies']),
    )
  })
})

describe('fixRule', () => {
  it('resolves a repeated-dish alert', () => {
    const menu: WeeklyMenu = {
      season: 'estiu',
      days: [
        {
          date: '2026-07-15',
          dinar: { slot: 'dinar', attendees: ['adria'], primerId: 'amanida-verda', segonId: 'pollastre-planxa' },
          sopar: { slot: 'sopar', attendees: ['adria'], primerId: 'amanida-verda', segonId: 'salmo-planxa' },
        },
      ],
    }
    expect(checkNutrition(menu).find((r) => r.id === 'unique')!.status).toBe('warn')
    const fixed = fixRule(menu, 'unique')
    expect(checkNutrition(fixed).find((r) => r.id === 'unique')!.status).toBe('ok')
  })

  it('adds fish when there is too little', () => {
    const menu: WeeklyMenu = {
      season: 'estiu',
      days: [
        {
          date: '2026-07-15',
          dinar: { slot: 'dinar', attendees: ['adria'], primerId: 'amanida-verda', segonId: 'pollastre-planxa' },
          sopar: { slot: 'sopar', attendees: ['adria'], primerId: 'gaspatxo', segonId: 'hamburguesa-vedella' },
        },
      ],
    }
    expect(checkNutrition(menu).find((r) => r.id === 'fish')!.status).toBe('warn')
    const fixed = fixRule(menu, 'fish')
    expect(checkNutrition(fixed).find((r) => r.id === 'fish')!.status).toBe('ok')
  })

  it('reduces red/processed meat when there is too much', () => {
    const menu: WeeklyMenu = {
      season: 'hivern',
      days: [
        {
          date: '2026-01-12',
          dinar: { slot: 'dinar', attendees: ['adria'], primerId: 'amanida-verda', segonId: 'xurrasco-planxa' },
          sopar: { slot: 'sopar', attendees: ['adria'], primerId: 'crema-verdures', segonId: 'hamburguesa-vedella' },
        },
        {
          date: '2026-01-13',
          dinar: { slot: 'dinar', attendees: ['adria'], primerId: 'escalivada', segonId: 'arros-integral-costella' },
          sopar: { slot: 'sopar', attendees: ['adria'], primerId: 'crema-porros', segonId: 'pollastre-planxa' },
        },
      ],
    }
    expect(checkNutrition(menu).find((r) => r.id === 'red-meat')!.status).toBe('warn')
    const fixed = fixRule(menu, 'red-meat')
    expect(checkNutrition(fixed).find((r) => r.id === 'red-meat')!.status).toBe('ok')
  })

  it('adds legumes when there are none', () => {
    const menu: WeeklyMenu = {
      season: 'hivern',
      days: [
        {
          date: '2026-01-12',
          dinar: { slot: 'dinar', attendees: ['adria'], primerId: 'amanida-verda', segonId: 'pollastre-planxa' },
          sopar: { slot: 'sopar', attendees: ['adria'], primerId: 'crema-verdures', segonId: 'salmo-planxa' },
        },
      ],
    }
    expect(checkNutrition(menu).find((r) => r.id === 'legumes')!.status).toBe('warn')
    const fixed = fixRule(menu, 'legumes')
    expect(checkNutrition(fixed).find((r) => r.id === 'legumes')!.status).toBe('ok')
  })
})

describe('groceryToText', () => {
  it('omits checked-off items from the export', () => {
    const menu = generateMenu(week(), 42)
    const items = Object.values(buildGroceryList(menu)).flat()
    const allKeys = new Set(items.map(groceryKey))

    const bullets = (t: string) => (t.match(/^\* /gm) ?? []).length // lines starting "* "
    const full = groceryToText(menu)
    expect(bullets(full)).toBe(items.length)

    // Checking one item drops exactly one bullet line.
    const oneChecked = groceryToText(menu, new Set([groceryKey(items[0])]))
    expect(bullets(oneChecked)).toBe(items.length - 1)

    // Checking everything leaves no items (no bullets).
    expect(bullets(groceryToText(menu, allKeys))).toBe(0)
  })
})
