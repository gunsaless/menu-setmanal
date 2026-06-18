import { useState } from 'react'
import { useStore } from '../store'
import { MAX_PEOPLE, MIN_PEOPLE } from '../core/types'

/** Edit the people: rename, add (up to MAX_PEOPLE) and remove (down to MIN_PEOPLE). */
export function NamesEditor() {
  const people = useStore((s) => s.people)
  const renamePerson = useStore((s) => s.renamePerson)
  const addPerson = useStore((s) => s.addPerson)
  const removePerson = useStore((s) => s.removePerson)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button className="names-btn" onClick={() => setOpen(true)}>
        ✏️ {people.map((p) => p.name).join(', ')}
      </button>
    )
  }

  return (
    <div className="names-editor">
      {people.map((p) => (
        <div key={p.id} className="names-row">
          <input
            aria-label={`Nom de ${p.name}`}
            value={p.name}
            onChange={(e) => renamePerson(p.id, e.target.value)}
          />
          <button
            className="names-remove"
            title="Treure persona"
            disabled={people.length <= MIN_PEOPLE}
            onClick={() => removePerson(p.id)}
          >
            ✕
          </button>
        </div>
      ))}
      <div className="names-actions">
        <button disabled={people.length >= MAX_PEOPLE} onClick={addPerson}>
          + Afegir persona
        </button>
        <button onClick={() => setOpen(false)}>Fet</button>
      </div>
    </div>
  )
}
