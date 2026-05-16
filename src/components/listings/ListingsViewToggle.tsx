'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { LayoutGrid, Map } from 'lucide-react'

export function ListingsViewToggle({ view }: { view: 'grid' | 'map' }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function setView(next: 'grid' | 'map') {
    const sp = new URLSearchParams(params.toString())
    if (next === 'grid') sp.delete('view')
    else sp.set('view', next)
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface border border-line shadow-soft shrink-0">
      <button
        type="button"
        onClick={() => setView('grid')}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg ease-smooth transition-all ${
          view === 'grid'
            ? 'bg-navy text-white shadow-[0_2px_8px_oklch(0.27_0.07_257_/_0.2)]'
            : 'text-ink-muted hover:text-ink'
        }`}
        aria-pressed={view === 'grid'}
      >
        <LayoutGrid className="w-4 h-4" />
        Grid
      </button>
      <button
        type="button"
        onClick={() => setView('map')}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg ease-smooth transition-all ${
          view === 'map'
            ? 'bg-navy text-white shadow-[0_2px_8px_oklch(0.27_0.07_257_/_0.2)]'
            : 'text-ink-muted hover:text-ink'
        }`}
        aria-pressed={view === 'map'}
      >
        <Map className="w-4 h-4" />
        Map
      </button>
    </div>
  )
}
