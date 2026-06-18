import { useState } from 'react'
import { useStore } from '../store'
import { dishById } from '../core/dishes'
import { DishPicker } from './DishPicker'
import type { Course, PlannedMeal, Slot } from '../core/types'

const DAY_NAMES = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte']
function label(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${DAY_NAMES[new Date(y, m - 1, d).getDay()]} ${d}/${m}`
}

function CourseRow(
  { date, slot, course, dishId }:
  { date: string; slot: Slot; course: Course; dishId: string | null },
) {
  const reroll = useStore((s) => s.reroll)
  const setDish = useStore((s) => s.setDish)
  const [picking, setPicking] = useState(false)
  const dish = dishId ? dishById(dishId) : null
  const cap = course === 'primer' ? 'Primer' : 'Segon'
  return (
    <div className="course">
      <span className="course-label">{cap}</span>
      <span className="course-name">{dish?.name ?? '—'}</span>
      <button className="reroll" title={`Canviar ${course} a l'atzar`} onClick={() => reroll(date, slot, course)}>🎲</button>
      <button className="reroll" title={`Triar ${course}`} onClick={() => setPicking(true)}>✏️</button>
      {picking && (
        <DishPicker
          course={course}
          currentId={dishId}
          onPick={(id) => { setDish(date, slot, course, id); setPicking(false) }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}

function MealCell({ date, slot, meal }: { date: string; slot: Slot; meal: PlannedMeal }) {
  const people = useStore((s) => s.people)
  if (meal.attendees.length === 0) return <span className="muted">— fora —</span>
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id
  return (
    <div className="meal">
      <CourseRow date={date} slot={slot} course="primer" dishId={meal.primerId} />
      <CourseRow date={date} slot={slot} course="segon" dishId={meal.segonId} />
      <span className="who" title={meal.attendees.map(nameOf).join(' + ')}>
        {meal.attendees.map((p) => nameOf(p)[0]?.toUpperCase()).join('+')}
      </span>
    </div>
  )
}

export function MenuView() {
  const menu = useStore((s) => s.menu)
  if (!menu) return null
  return (
    <div className="table-scroll">
      <table className="grid menu">
        <thead><tr><th>Dia</th><th>Dinar</th><th>Sopar</th></tr></thead>
        <tbody>
          {menu.days.map((d) => (
            <tr key={d.date}>
              <td>{label(d.date)}</td>
              <td><MealCell date={d.date} slot="dinar" meal={d.dinar} /></td>
              <td><MealCell date={d.date} slot="sopar" meal={d.sopar} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
