import type { PersonInfo, PlannedMeal, WeeklyMenu } from './types'
import { DEFAULT_PEOPLE } from './types'
import { dishById } from './dishes'
import { buildGroceryList, CATEGORY_LABELS, groceryKey, type GroceryItem } from './grocery'
import type { GroceryCategory } from './types'

const DAY_NAMES = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte']
const MONTHS = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre']

/** Bold day header, e.g. "*Dilluns 15 Juny*". */
function dayHeader(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return `*${DAY_NAMES[dow]} ${d} ${MONTHS[m - 1]}*`
}

function dishName(id: string | null): string {
  if (!id) return '—'
  return dishById(id)?.name ?? id
}

/**
 * One meal block for the menu export, e.g.
 *   Dinar:
 *   - Amanida tomàquet
 *   - Pollastre planxa
 * Both/all out → "Sopar _Fora_" (no dishes). Some out → "Sopar _Adrià fora_" + dishes.
 */
function mealBlock(label: string, meal: PlannedMeal, people: PersonInfo[]): string[] {
  if (meal.attendees.length === 0) return [`${label} _Fora_`]
  const absent = people.filter((p) => !meal.attendees.includes(p.id))
  const header = absent.length > 0
    ? `${label} _${absent.map((p) => p.name).join(', ')} fora_`
    : `${label}:`
  return [header, `- ${dishName(meal.primerId)}`, `- ${dishName(meal.segonId)}`]
}

/** WhatsApp-friendly plain-text menu. */
export function menuToText(menu: WeeklyMenu, people: PersonInfo[] = DEFAULT_PEOPLE): string {
  const lines: string[] = []
  for (const day of menu.days) {
    lines.push(dayHeader(day.date))
    lines.push(...mealBlock('Dinar', day.dinar, people))
    lines.push(...mealBlock('Sopar', day.sopar, people))
    lines.push('')
  }
  return lines.join('\n').trim()
}

/**
 * WhatsApp-friendly plain-text grocery list.
 * Items whose key is in `checked` (already-have-it) are omitted. When
 * `grouped` is true (default) items are split by category; otherwise a single
 * flat alphabetical list is returned.
 */
export function groceryToText(menu: WeeklyMenu, checked?: Set<string>, grouped = true): string {
  const groups = buildGroceryList(menu)
  const lines = ['🛒 *LLISTA DE LA COMPRA*', '']

  if (!grouped) {
    const items = (Object.values(groups).flat() as GroceryItem[])
      .filter((it) => !checked?.has(groceryKey(it)))
      .sort((a, b) => a.item.localeCompare(b.item))
    // Leading "* " makes WhatsApp render it as a bulleted list.
    for (const it of items) lines.push(`* ${fmtItem(it)}`)
    return lines.join('\n').trim()
  }

  for (const cat of Object.keys(groups) as GroceryCategory[]) {
    const items = groups[cat].filter((it) => !checked?.has(groceryKey(it)))
    if (items.length === 0) continue
    lines.push(`*${CATEGORY_LABELS[cat]}*`)
    for (const it of items) lines.push(`* ${fmtItem(it)}`)
    lines.push('')
  }
  return lines.join('\n').trim()
}

function fmtItem(it: GroceryItem): string {
  if (it.qty == null) return it.item
  return `${it.item} — ${it.qty}${it.unit ? ' ' + it.unit : ''}`
}
