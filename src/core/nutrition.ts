import type { Course, Dish, Slot, Tag, WeeklyMenu } from './types'
import { dishById, poolFor } from './dishes'

export type RuleStatus = 'ok' | 'warn'

export interface RuleResult {
  id: string
  label: string
  status: RuleStatus
  detail: string
}

interface Meal {
  dishes: Dish[] // both courses that are actually eaten
  main?: Dish // the "segon" (protein) dish
}

/** Gather the eaten meals (skipping the ones where both are out). */
function collect(menu: WeeklyMenu): { meals: Meal[]; all: Dish[]; mains: Dish[] } {
  const meals: Meal[] = []
  for (const day of menu.days) {
    for (const m of [day.dinar, day.sopar]) {
      if (m.attendees.length === 0) continue
      const primer = m.primerId ? dishById(m.primerId) : undefined
      const main = m.segonId ? dishById(m.segonId) : undefined
      meals.push({ dishes: [primer, main].filter(Boolean) as Dish[], main })
    }
  }
  const all = meals.flatMap((m) => m.dishes)
  const mains = meals.map((m) => m.main).filter(Boolean) as Dish[]
  return { meals, all, mains }
}

const VEG_TAGS: Tag[] = ['verdura', 'amanida', 'crema']
const hasTag = (d: Dish, t: Tag) => d.tags.includes(t)
const hasVeg = (d: Dish) => d.tags.some((t) => VEG_TAGS.includes(t))
const hasCarb = (d: Dish) => d.ingredients.some((i) => i.category === 'llegums-cereals')
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

const hay = (d: Dish) => (d.name + ' ' + d.ingredients.map((i) => i.item).join(' ')).toLowerCase()

// Red & processed meat — WHO/IARC class processed meat as carcinogenic (Group 1)
// and red meat as probably carcinogenic (2A); WCRF/ANSES advise ≤ ~3 portions
// (~350–500 g cooked) of red meat per week and little/no processed meat.
const RED_MEAT = ['vedella', 'porc', 'costella', 'xurrasco', 'botifarra', 'llom', 'bou', 'xai', 'embotit', 'salsitxa', 'bacó', 'cansalada']
const isRedMeat = (d: Dish) => hasTag(d, 'carn') && RED_MEAT.some((k) => hay(d).includes(k))

// Pulses & plant protein — Mediterranean (≥3 servings/week) and EAT-Lancet
// (daily, plant protein as the main protein source) both prioritise legumes.
const LEGUME_WORDS = ['llenti', 'cigró', 'cigro', 'fesol', 'mongeta seca', 'mongetes cuites', 'pèsol', 'pesol', 'fava', 'tofu', 'tempeh', 'soja', 'hummus', 'edamame']
const isLegume = (d: Dish) => hasTag(d, 'llegum') || LEGUME_WORDS.some((k) => hay(d).includes(k))

/** Evaluate a generated menu against a few basic nutritional rules. */
export function checkNutrition(menu: WeeklyMenu): RuleResult[] {
  const { meals, all, mains } = collect(menu)
  const results: RuleResult[] = []

  if (meals.length === 0) {
    return [{ id: 'empty', label: 'Sense àpats', status: 'ok', detail: 'Cap àpat a casa aquesta setmana.' }]
  }

  // 1. Unique dishes across the week.
  const counts = new Map<string, { name: string; n: number }>()
  for (const d of all) {
    const e = counts.get(d.id) ?? { name: d.name, n: 0 }
    e.n += 1
    counts.set(d.id, e)
  }
  const dups = [...counts.values()].filter((e) => e.n > 1)
  results.push({
    id: 'unique',
    label: 'Plats únics a la setmana',
    status: dups.length ? 'warn' : 'ok',
    detail: dups.length
      ? `Repetits: ${dups.map((d) => `${d.name} (×${d.n})`).join(', ')}`
      : 'Cap plat repetit.',
  })

  // 2. Protein balance — vary the protein source; no single type should
  //    dominate. EAT-Lancet frames plant protein (legumes) as the main source,
  //    so legumes count alongside fish/meat/egg here.
  const proteins: { label: string; test: (d: Dish) => boolean }[] = [
    { label: 'peix', test: (d) => hasTag(d, 'peix') },
    { label: 'carn', test: (d) => hasTag(d, 'carn') },
    { label: 'ou', test: (d) => hasTag(d, 'ou') },
    { label: 'llegum', test: isLegume },
  ]
  const protCounts = proteins.map((p) => ({ ...p, n: mains.filter(p.test).length }))
  const totalProt = protCounts.reduce((s, p) => s + p.n, 0)
  const dominant = protCounts.find((p) => totalProt >= 3 && p.n / totalProt > 0.5)
  results.push({
    id: 'protein-balance',
    label: 'Equilibri de proteïnes',
    status: dominant ? 'warn' : 'ok',
    detail: protCounts.map((p) => `${p.label}: ${p.n}`).join(' · ') +
      (dominant ? ` — massa ${dominant.label} (${pct(dominant.n, totalProt)}%)` : ''),
  })

  // 3. Enough fish — ≥ ~20% of mains (≈2 servings/week), per AHA & Mediterranean
  //    guidance (preferably oily fish for omega-3).
  const fish = mains.filter((d) => hasTag(d, 'peix')).length
  results.push({
    id: 'fish',
    label: 'Peix suficient',
    status: mains.length && fish / mains.length >= 0.2 ? 'ok' : 'warn',
    detail: `${fish} de ${mains.length} plats principals (${pct(fish, mains.length)}%). Recomanat ≥ 2 racions/setmana (millor peix blau).`,
  })

  // 4. Legumes — present in ≥ ~20% of meals (≈3 servings/week), per Mediterranean
  //    & EAT-Lancet emphasis on pulses as the primary protein.
  const legumeMeals = meals.filter((m) => m.dishes.some(isLegume)).length
  results.push({
    id: 'legumes',
    label: 'Llegums suficients',
    status: legumeMeals / meals.length >= 0.2 ? 'ok' : 'warn',
    detail: `${legumeMeals} de ${meals.length} àpats amb llegums (${pct(legumeMeals, meals.length)}%). Recomanat ≥ 3 racions/setmana.`,
  })

  // 5. Limit red & processed meat — ≤ ~3 servings/week (WHO/IARC, WCRF).
  const redMains = mains.filter(isRedMeat).length
  const redOver = mains.length >= 3 && redMains / mains.length > 0.3
  results.push({
    id: 'red-meat',
    label: 'Carn vermella moderada',
    status: redOver || redMains > 3 ? 'warn' : 'ok',
    detail: `${redMains} plats amb carn vermella/processada. Recomanat ≤ 3/setmana.`,
  })

  // 6. Whole grains present — they're a daily base food (EAT-Lancet 3–5/day);
  //    only refined carbs are limited, so there is no upper bound here.
  const carbMeals = meals.filter((m) => m.dishes.some(hasCarb)).length
  results.push({
    id: 'carbs',
    label: 'Hidrats integrals',
    status: carbMeals / meals.length >= 0.2 ? 'ok' : 'warn',
    detail: `${carbMeals} de ${meals.length} àpats amb cereals integrals o llegums (${pct(carbMeals, meals.length)}%). Recomanat: integrals cada dia.`,
  })

  // 7. Vegetables in (almost) every meal — WHO ≥400 g/day; Mediterranean veg at
  //    both lunch and dinner.
  const vegMeals = meals.filter((m) => m.dishes.some(hasVeg)).length
  results.push({
    id: 'veggies',
    label: 'Verdura a cada àpat',
    status: vegMeals / meals.length >= 0.8 ? 'ok' : 'warn',
    detail: `${vegMeals} de ${meals.length} àpats amb verdura/amanida (${pct(vegMeals, meals.length)}%). Recomanat ≥ 80%.`,
  })

  return results
}

// ── Auto-fix ────────────────────────────────────────────────────────────────
// Each fixer makes the smallest changes it can to turn a failing rule green,
// swapping individual dishes (respecting season/slot/course) and avoiding
// duplicates. The UI re-runs checkNutrition after a fix so the alerts refresh.

const SLOTS: Slot[] = ['dinar', 'sopar']
interface Loc { day: number; slot: Slot; course: Course }
const field = (c: Course) => (c === 'primer' ? 'primerId' : 'segonId')

function eatenLocs(menu: WeeklyMenu): Loc[] {
  const out: Loc[] = []
  menu.days.forEach((d, i) => {
    for (const slot of SLOTS) {
      if (d[slot].attendees.length === 0) continue
      out.push({ day: i, slot, course: 'primer' }, { day: i, slot, course: 'segon' })
    }
  })
  return out
}

const idAt = (menu: WeeklyMenu, l: Loc) => menu.days[l.day][l.slot][field(l.course)]
const dishAt = (menu: WeeklyMenu, l: Loc) => { const id = idAt(menu, l); return id ? dishById(id) : undefined }

function withId(menu: WeeklyMenu, l: Loc, id: string): WeeklyMenu {
  const days = menu.days.map((d, i) =>
    i === l.day ? { ...d, [l.slot]: { ...d[l.slot], [field(l.course)]: id } } : d,
  )
  return { ...menu, days }
}

const chosenIds = (menu: WeeklyMenu) =>
  eatenLocs(menu).map((l) => idAt(menu, l)).filter(Boolean) as string[]

/** Pick a replacement for a location matching `pred`, preferring non-duplicates. */
function pickReplacement(menu: WeeklyMenu, l: Loc, pred: (d: Dish) => boolean): string | null {
  const used = new Set(chosenIds(menu))
  const current = idAt(menu, l)
  const pool = poolFor(menu.season, l.slot, l.course).filter((d) => d.id !== current && pred(d))
  const fresh = pool.filter((d) => !used.has(d.id))
  const cands = fresh.length ? fresh : pool
  if (!cands.length) return null
  return cands[Math.floor(Math.random() * cands.length)].id
}

const ruleStatus = (menu: WeeklyMenu, id: string) =>
  checkNutrition(menu).find((r) => r.id === id)?.status

/** Resolve a specific nutritional alert by swapping dishes. Returns a new menu. */
export function fixRule(menu: WeeklyMenu, ruleId: string): WeeklyMenu {
  switch (ruleId) {
    case 'unique': return fixUnique(menu)
    case 'protein-balance': return fixProtein(menu)
    case 'fish': return fixTowards(menu, 'fish', 'segon', (d) => d.tags.includes('peix'))
    case 'legumes': return fixTowards(menu, 'legumes', 'segon', isLegume)
    case 'red-meat': return fixRedMeat(menu)
    case 'carbs': return fixCarbs(menu)
    case 'veggies': return fixVeggies(menu)
    default: return menu
  }
}

/** Generic: keep swapping a course towards dishes matching `pred` until the rule passes. */
function fixTowards(
  menu: WeeklyMenu, ruleId: string, course: Course, pred: (d: Dish) => boolean,
): WeeklyMenu {
  let m = menu
  for (let i = 0; i < 14 && ruleStatus(m, ruleId) === 'warn'; i++) {
    const target = eatenLocs(m).find((l) => {
      const d = dishAt(m, l)
      return l.course === course && d && !pred(d)
    })
    if (!target) break
    const repl = pickReplacement(m, target, pred)
    if (!repl) break
    m = withId(m, target, repl)
  }
  return m
}

function fixRedMeat(menu: WeeklyMenu): WeeklyMenu {
  let m = menu
  for (let i = 0; i < 14 && ruleStatus(m, 'red-meat') === 'warn'; i++) {
    const target = eatenLocs(m).find((l) => {
      const d = dishAt(m, l)
      return l.course === 'segon' && d && isRedMeat(d)
    })
    if (!target) break
    const repl = pickReplacement(m, target, (d) => !isRedMeat(d))
    if (!repl) break
    m = withId(m, target, repl)
  }
  return m
}

function fixUnique(menu: WeeklyMenu): WeeklyMenu {
  const seen = new Set<string>()
  let m = menu
  for (const l of eatenLocs(m)) {
    const id = idAt(m, l)
    if (!id) continue
    if (seen.has(id)) {
      const repl = pickReplacement(m, l, () => true)
      seen.add(repl ?? id)
      if (repl) m = withId(m, l, repl)
    } else {
      seen.add(id)
    }
  }
  return m
}

const PROTEIN_TESTS: ((d: Dish) => boolean)[] = [
  (d) => d.tags.includes('peix'),
  (d) => d.tags.includes('carn'),
  (d) => d.tags.includes('ou'),
  isLegume,
]

function fixProtein(menu: WeeklyMenu): WeeklyMenu {
  let m = menu
  for (let i = 0; i < 14 && ruleStatus(m, 'protein-balance') === 'warn'; i++) {
    const mains = eatenLocs(m)
      .filter((l) => l.course === 'segon')
      .map((l) => ({ l, d: dishAt(m, l) }))
      .filter((x) => x.d) as { l: Loc; d: Dish }[]
    const total = mains.length
    const dom = PROTEIN_TESTS
      .map((test) => ({ test, n: mains.filter((x) => test(x.d)).length }))
      .find((c) => total >= 3 && c.n / total > 0.5)
    if (!dom) break
    const target = mains.find((x) => dom.test(x.d))
    if (!target) break
    const repl = pickReplacement(m, target.l, (d) => !dom.test(d))
    if (!repl) break
    m = withId(m, target.l, repl)
  }
  return m
}

function fixVeggies(menu: WeeklyMenu): WeeklyMenu {
  let m = menu
  for (let i = 0; i < 16 && ruleStatus(m, 'veggies') === 'warn'; i++) {
    // Find an eaten meal whose dishes lack vegetables.
    const dayLoc = eatenLocs(m).find((l) => {
      const day = m.days[l.day]
      const dishes = [day[l.slot].primerId, day[l.slot].segonId]
        .map((id) => (id ? dishById(id) : undefined)).filter(Boolean) as Dish[]
      return !dishes.some(hasVeg)
    })
    if (!dayLoc) break
    const loc: Loc = { day: dayLoc.day, slot: dayLoc.slot, course: 'primer' }
    const repl = pickReplacement(m, loc, hasVeg)
    if (!repl) break
    m = withId(m, loc, repl)
  }
  return m
}

function fixCarbs(menu: WeeklyMenu): WeeklyMenu {
  let m = menu
  // Whole grains have no upper limit, so we only ever add them to meals lacking any.
  for (let i = 0; i < 16 && ruleStatus(m, 'carbs') === 'warn'; i++) {
    const mealLoc = eatenLocs(m).find((l) => {
      const day = m.days[l.day]
      const dishes = [day[l.slot].primerId, day[l.slot].segonId]
        .map((id) => (id ? dishById(id) : undefined)).filter(Boolean) as Dish[]
      return !dishes.some(hasCarb)
    })
    if (!mealLoc) break
    let changed = false
    for (const course of ['primer', 'segon'] as Course[]) {
      const loc: Loc = { day: mealLoc.day, slot: mealLoc.slot, course }
      const repl = pickReplacement(m, loc, hasCarb)
      if (repl) { m = withId(m, loc, repl); changed = true; break }
    }
    if (!changed) break
  }
  return m
}
