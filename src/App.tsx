import { useEffect, useState } from 'react'
import { useStore } from './store'
import { SEASON_LABELS, seasonForDate } from './core/season'
import { AttendanceGrid } from './components/AttendanceGrid'
import { MenuView } from './components/MenuView'
import { NutritionView } from './components/NutritionView'
import { GroceryView } from './components/GroceryView'
import { TextExport } from './components/TextExport'
import { NamesEditor } from './components/NamesEditor'
import { UpdateBanner } from './components/UpdateBanner'

export function App() {
  const { attendance, menu, setRange, generate, people, theme, toggleTheme } = useStore()
  const [start, setStart] = useState(attendance[0]?.date ?? '')
  const [days, setDays] = useState(7)

  // Keep the browser tab title in sync with the chosen names.
  useEffect(() => {
    document.title = `Menú setmanal · ${people.map((p) => p.name).join(' & ')}`
  }, [people])

  // Apply the colour theme to the document root.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="app">
      <UpdateBanner />
      <header className="app-header">
        <h1>🍽️ Menú setmanal</h1>
        <NamesEditor />
        <button
          className="theme-btn"
          title={theme === 'dark' ? 'Mode clar' : 'Mode fosc'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <section className="card">
        <h2>1. Dates</h2>
        <div className="row dates-row">
          <label>
            Inici
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label>
            Dies
            <input
              type="number" min={1} max={14} value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </label>
          <button onClick={() => setRange(start, days)}>Aplicar</button>
          {start && <span className="badge">Temporada: {SEASON_LABELS[seasonForDate(start)]}</span>}
        </div>
      </section>

      <section className="card">
        <h2>2. Qui menja a casa?</h2>
        <AttendanceGrid />
      </section>

      <div className="row">
        <button className="primary" onClick={generate}>Generar menú ✨</button>
      </div>

      {menu && (
        <>
          <section className="card"><h2>3. Menú</h2><MenuView /></section>
          <section className="card"><h2>4. Anàlisi nutricional</h2><NutritionView /></section>
          <section className="card"><h2>5. Llista de la compra</h2><GroceryView /></section>
          <section className="card"><h2>6. Exportar (WhatsApp)</h2><TextExport /></section>
        </>
      )}
    </div>
  )
}
