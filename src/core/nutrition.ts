import type { Dish, Tag, WeeklyMenu } from './types'
import { dishById } from './dishes'

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

  // 2. Protein balance — no single protein type should dominate the mains.
  const proteins: { tag: Tag; label: string }[] = [
    { tag: 'peix', label: 'peix' },
    { tag: 'carn', label: 'carn' },
    { tag: 'ou', label: 'ou' },
  ]
  const protCounts = proteins.map((p) => ({ ...p, n: mains.filter((d) => hasTag(d, p.tag)).length }))
  const totalProt = protCounts.reduce((s, p) => s + p.n, 0)
  const dominant = protCounts.find((p) => totalProt >= 3 && p.n / totalProt > 0.5)
  results.push({
    id: 'protein-balance',
    label: 'Equilibri de proteïnes',
    status: dominant ? 'warn' : 'ok',
    detail: protCounts.map((p) => `${p.label}: ${p.n}`).join(' · ') +
      (dominant ? ` — massa ${dominant.label} (${pct(dominant.n, totalProt)}%)` : ''),
  })

  // 3. Enough fish — fish should be at least ~30% of the main dishes.
  const fish = mains.filter((d) => hasTag(d, 'peix')).length
  results.push({
    id: 'fish',
    label: 'Peix suficient',
    status: mains.length && fish / mains.length >= 0.3 ? 'ok' : 'warn',
    detail: `${fish} de ${mains.length} plats principals (${pct(fish, mains.length)}%). Recomanat ≥ 30%.`,
  })

  // 4. Carbohydrate balance — whole-grain/legume carbs present, but not every meal.
  const carbMeals = meals.filter((m) => m.dishes.some(hasCarb)).length
  const carbShare = carbMeals / meals.length
  const carbOk = carbShare >= 0.15 && carbShare <= 0.66
  results.push({
    id: 'carbs',
    label: 'Equilibri d\'hidrats de carboni',
    status: carbOk ? 'ok' : 'warn',
    detail:
      `${carbMeals} de ${meals.length} àpats amb hidrats integrals (${pct(carbMeals, meals.length)}%). ` +
      (carbShare < 0.15 ? 'Massa pocs.' : carbShare > 0.66 ? 'Massa.' : 'Recomanat 15–66%.'),
  })

  // 5. Vegetables in (almost) every meal.
  const vegMeals = meals.filter((m) => m.dishes.some(hasVeg)).length
  results.push({
    id: 'veggies',
    label: 'Verdura a cada àpat',
    status: vegMeals / meals.length >= 0.8 ? 'ok' : 'warn',
    detail: `${vegMeals} de ${meals.length} àpats amb verdura/amanida (${pct(vegMeals, meals.length)}%). Recomanat ≥ 80%.`,
  })

  return results
}
