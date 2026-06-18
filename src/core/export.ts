import type { PlannedMeal, WeeklyMenu } from './types'
import { dishById } from './dishes'
import { buildGroceryList, CATEGORY_LABELS, groceryKey, type GroceryItem } from './grocery'
import type { GroceryCategory } from './types'

const DAY_NAMES = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte']

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${DAY_NAMES[new Date(y, m - 1, d).getDay()]} ${d}/${m}`
}

function dishName(id: string | null): string {
  if (!id) return '—'
  return dishById(id)?.name ?? id
}

/** "Primer / Segon" one-liner for a meal. */
function mealText(meal: PlannedMeal): string {
  return `${dishName(meal.primerId)} / ${dishName(meal.segonId)}`
}

/** WhatsApp-friendly plain-text menu. */
export function menuToText(menu: WeeklyMenu): string {
  const lines = ['🍽️ *MENÚ SETMANAL*', '']
  for (const day of menu.days) {
    lines.push(`*${dayLabel(day.date)}*`)
    if (day.dinar.attendees.length) lines.push(`  🥗 Dinar: ${mealText(day.dinar)}`)
    if (day.sopar.attendees.length) lines.push(`  🌙 Sopar: ${mealText(day.sopar)}`)
    lines.push('')
  }
  return lines.join('\n').trim()
}

/**
 * WhatsApp-friendly plain-text grocery list.
 * Items whose key is in `checked` (already-have-it) are omitted, and any
 * category left empty is dropped entirely.
 */
export function groceryToText(menu: WeeklyMenu, checked?: Set<string>): string {
  const grouped = buildGroceryList(menu)
  const lines = ['🛒 *LLISTA DE LA COMPRA*', '']
  for (const cat of Object.keys(grouped) as GroceryCategory[]) {
    const items = grouped[cat].filter((it) => !checked?.has(groceryKey(it)))
    if (items.length === 0) continue
    lines.push(`*${CATEGORY_LABELS[cat]}*`)
    for (const it of items) lines.push(`  • ${fmtItem(it)}`)
    lines.push('')
  }
  return lines.join('\n').trim()
}

function fmtItem(it: GroceryItem): string {
  if (it.qty == null) return it.item
  return `${it.item} — ${it.qty}${it.unit ? ' ' + it.unit : ''}`
}
