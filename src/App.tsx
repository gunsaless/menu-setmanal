import { useState } from 'react'
import { useStore } from './store'
import { SEASON_LABELS, seasonForDate } from './core/season'
import { AttendanceGrid } from './components/AttendanceGrid'
import { MenuView } from './components/MenuView'
import { GroceryView } from './components/GroceryView'
import { TextExport } from './components/TextExport'
import { NamesEditor } from './components/NamesEditor'
import { UpdateBanner } from './components/UpdateBanner'

export function App() {
  const { attendance, menu, setRange, generate } = useStore()
  const [start, setStart] = useState(attendance[0]?.date ?? '')
  const [days, setDays] = useState(7)

  return (
    <div className="app">
      <UpdateBanner />
      <header className="app-header">
        <h1>🍽️ Menú setmanal</h1>
        <NamesEditor />
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
          <section className="card"><h2>4. Llista de la compra</h2><GroceryView /></section>
          <section className="card"><h2>5. Exportar (WhatsApp)</h2><TextExport /></section>
        </>
      )}
    </div>
  )
}
