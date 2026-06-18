import { useStore } from '../store'
import { buildGroceryList, CATEGORY_LABELS, groceryKey } from '../core/grocery'
import type { GroceryCategory } from '../core/types'

export function GroceryView() {
  const menu = useStore((s) => s.menu)
  const checked = useStore((s) => s.checkedGrocery)
  const toggleGrocery = useStore((s) => s.toggleGrocery)
  if (!menu) return null
  const grouped = buildGroceryList(menu)
  const cats = Object.keys(grouped) as GroceryCategory[]
  return (
    <div className="grocery">
      <p className="hint">Marca el que ja tens: desapareixerà de la llista per WhatsApp.</p>
      <div className="grocery-cols">
        {cats.map((cat) => (
          <div key={cat} className="grocery-cat">
            <h3>{CATEGORY_LABELS[cat]}</h3>
            <ul>
              {grouped[cat].map((it) => {
                const key = groceryKey(it)
                const isChecked = checked.has(key)
                return (
                  <li key={key}>
                    <label className={isChecked ? 'checked' : ''}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleGrocery(key)}
                      />
                      {it.item}
                      {it.qty != null && (
                        <span className="qty"> · {it.qty}{it.unit ? ' ' + it.unit : ''}</span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
