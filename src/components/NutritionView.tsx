import { useStore } from '../store'
import { checkNutrition } from '../core/nutrition'

export function NutritionView() {
  const menu = useStore((s) => s.menu)
  if (!menu) return null
  const results = checkNutrition(menu)
  const warnings = results.filter((r) => r.status === 'warn').length

  return (
    <div className="nutrition">
      <p className="hint">
        {warnings === 0
          ? 'Tot equilibrat ✅'
          : `${warnings} ${warnings === 1 ? 'avís' : 'avisos'} a revisar`}
      </p>
      <ul>
        {results.map((r) => (
          <li key={r.id} className={r.status}>
            <span className="rule-icon">{r.status === 'ok' ? '✅' : '⚠️'}</span>
            <span className="rule-text">
              <strong>{r.label}</strong>
              <span className="rule-detail">{r.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
