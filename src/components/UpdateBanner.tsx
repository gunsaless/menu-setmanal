import { useEffect, useState } from 'react'

// The browser caches index.html (GitHub Pages sets a short max-age and we can't
// change it), so after a deploy the old page keeps loading until it's hard
// refreshed. This component fetches index.html (bypassing cache) on focus and
// on an interval, compares the hashed entry script with the one currently
// running, and offers a one-click reload when they differ.

function entryName(src: string | null | undefined): string | null {
  return src?.match(/index-[A-Za-z0-9_-]+\.js/)?.[0] ?? null
}

/** The hashed entry script the page is currently running (null in dev). */
function currentEntry(): string | null {
  const s = document.querySelector('script[type="module"][src*="/assets/"]')
  return entryName(s?.getAttribute('src'))
}

/** The hashed entry script of the freshly-deployed index.html. */
async function latestEntry(): Promise<string | null> {
  const res = await fetch(`${window.location.pathname}?_=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) return null
  return entryName(await res.text())
}

export function UpdateBanner() {
  const [updated, setUpdated] = useState(false)

  useEffect(() => {
    const current = currentEntry()
    if (!current) return // dev mode (no hashed bundle) — nothing to check
    let cancelled = false

    const check = async () => {
      try {
        const latest = await latestEntry()
        if (!cancelled && latest && latest !== current) setUpdated(true)
      } catch {
        /* offline or transient — try again next tick */
      }
    }

    const id = window.setInterval(check, 60_000)
    window.addEventListener('focus', check)
    check()
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('focus', check)
    }
  }, [])

  if (!updated) return null
  return (
    <div className="update-banner">
      <span>Hi ha una nova versió disponible.</span>
      <button onClick={() => window.location.reload()}>Actualitza</button>
    </div>
  )
}
