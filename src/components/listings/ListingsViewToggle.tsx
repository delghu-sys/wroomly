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

  const base =
    'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition'
  const active = 'bg-white text-ink shadow-sm'
  const inactive = 'text-ink-muted hover:text-ink'

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-ink-soft/10 border border-line">
      <button
        type="button"
        onClick={() => setView('grid')}
        className={`${base} ${view === 'grid' ? active : inactive}`}
        aria-pressed={view === 'grid'}
      >
        <LayoutGrid className="w-4 h-4" />
        Grid
      </button>
      <button
        type="button"
        onClick={() => setView('map')}
        className={`${base} ${view === 'map' ? active : inactive}`}
        aria-pressed={view === 'map'}
      >
        <Map className="w-4 h-4" />
        Map
      </button>
    </div>
  )
}
