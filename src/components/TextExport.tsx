import { useState } from 'react'
import type { ReactNode } from 'react'
import { useStore } from '../store'
import { menuToText, groceryToText } from '../core/export'

/** A read-only text box with its own copy-to-clipboard button. */
function CopyBox(
  { title, text, rows, control }:
  { title: string; text: string; rows: number; control?: ReactNode },
) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="copybox">
      <div className="row">
        <strong>{title}</strong>
        {control}
        <button className="copy-btn" onClick={copy}>{copied ? 'Copiat! ✅' : 'Copiar'}</button>
      </div>
      <textarea readOnly value={text} rows={rows} />
    </div>
  )
}

export function TextExport() {
  const menu = useStore((s) => s.menu)
  const checked = useStore((s) => s.checkedGrocery)
  const people = useStore((s) => s.people)
  const [grouped, setGrouped] = useState(true)
  if (!menu) return null

  return (
    <div className="export">
      <CopyBox title="Menú" text={menuToText(menu, people)} rows={12} />
      {/* Items checked off in the grocery view are excluded from this list. */}
      <CopyBox
        title="Llista de la compra"
        text={groceryToText(menu, checked, grouped)}
        rows={12}
        control={
          <button onClick={() => setGrouped((g) => !g)}>
            {grouped ? 'Llista simple' : 'Per seccions'}
          </button>
        }
      />
    </div>
  )
}
