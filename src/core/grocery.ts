import type { GroceryCategory, WeeklyMenu } from './types'
import { dishById } from './dishes'

export interface GroceryItem {
  item: string
  qty?: number
  unit?: string
  category: GroceryCategory
}

/** Stable identity for a grocery item (used to track "already have it" checks). */
export function groceryKey(it: GroceryItem): string {
  return `${it.item}__${it.unit ?? ''}__${it.category}`
}

export const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  'verdura-fruita': 'Verdura i fruita',
  'peix-carn': 'Peix i carn',
  'lactics-ous': 'Làctics i ous',
  'llegums-cereals': 'Llegums i cereals',
  'fruits-secs-llavors': 'Fruits secs i llavors',
  'herbes-condiments': 'Herbes i condiments',
  altres: 'Altres',
}

/** Aggregate ingredients across all planned meals, scaled by attendees. */
export function buildGroceryList(menu: WeeklyMenu): Record<GroceryCategory, GroceryItem[]> {
  const acc = new Map<string, GroceryItem>()

  for (const day of menu.days) {
    for (const meal of [day.dinar, day.sopar]) {
      for (const dishId of [meal.primerId, meal.segonId]) {
        if (!dishId) continue
        const dish = dishById(dishId)
        if (!dish || dish.free) continue
        const factor = meal.attendees.length / dish.servingsBase

        for (const ing of dish.ingredients) {
        const key = `${ing.item}__${ing.unit ?? ''}__${ing.category}`
        const addQty =
          ing.qty != null
            ? ing.scalable === false
              ? ing.qty
              : ing.qty * factor
            : undefined
        const existing = acc.get(key)
        if (existing) {
          if (addQty != null) existing.qty = (existing.qty ?? 0) + addQty
        } else {
          acc.set(key, {
            item: ing.item,
            qty: addQty != null ? round(addQty) : undefined,
            unit: ing.unit,
            category: ing.category,
          })
        }
        }
      }
    }
  }

  const grouped = {} as Record<GroceryCategory, GroceryItem[]>
  for (const it of acc.values()) {
    if (it.qty != null) it.qty = round(it.qty)
    ;(grouped[it.category] ??= []).push(it)
  }
  for (const cat of Object.keys(grouped) as GroceryCategory[]) {
    grouped[cat].sort((a, b) => a.item.localeCompare(b.item))
  }
  return grouped
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
