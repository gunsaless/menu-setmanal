import { useState } from 'react'
import { useStore } from '../store'
import { menuToText, groceryToText } from '../core/export'

export function TextExport() {
  const menu = useStore((s) => s.menu)
  const checked = useStore((s) => s.checkedGrocery)
  const [copied, setCopied] = useState('')
  if (!menu) return null

  // Items checked off in the grocery view are excluded from the export.
  const text = `${menuToText(menu)}\n\n${groceryToText(menu, checked)}`

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied('Copiat! ✅')
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="export">
      <div className="row">
        <button onClick={copy}>Copiar tot {copied}</button>
      </div>
      <textarea readOnly value={text} rows={18} />
    </div>
  )
}
