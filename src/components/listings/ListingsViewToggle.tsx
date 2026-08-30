'use client'

import { useSearchParams, usePathname } from 'next/navigation'
import { useFilterNavigation } from './FilterTransition'
import { motion } from 'motion/react'
import { LayoutGrid, Map } from 'lucide-react'

export type BrowseView = 'grid' | 'map'

export function ListingsViewToggle({ view }: { view: BrowseView }) {
  const { navigate } = useFilterNavigation()
  const pathname = usePathname()
  const params = useSearchParams()

  function setView(next: BrowseView) {
    const sp = new URLSearchParams(params.toString())
    if (next === 'grid') sp.delete('view')
    else sp.set('view', next)
    const qs = sp.toString()
    navigate(qs ? `${pathname}?${qs}` : pathname, { scroll: false, replace: true })
  }

  const spring = { type: 'spring' as const, stiffness: 400, damping: 32 }

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.05] backdrop-blur border border-white/[0.07] shrink-0">
      {(['grid', 'map'] as const).map(opt => {
        const active = view === opt
        const Icon = opt === 'grid' ? LayoutGrid : Map
        const label = opt === 'grid' ? 'Grid' : 'Map'
        return (
          <button
            key={opt}
            type="button"
            onClick={() => setView(opt)}
            aria-pressed={active}
            className="relative inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium transition-colors duration-300 active:scale-[0.97] rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-maize-bright/30"
          >
            {active && (
              <motion.span
                layoutId="view-toggle-active"
                transition={spring}
                className="absolute inset-0 rounded-full bg-maize-bright shadow-glow-maize"
              />
            )}
            <span
              className={`relative z-10 inline-flex items-center gap-1.5 ${
                active ? 'text-navy-deep' : 'text-white/65 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
