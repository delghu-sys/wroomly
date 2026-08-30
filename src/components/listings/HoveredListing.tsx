'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Which listing the pointer is currently on, shared between the results list
 * and the map so the two can point at each other.
 *
 * Deliberately the smallest possible piece of state. The map does NOT re-render
 * when this changes — it reads the id and toggles a class on the one pin
 * element that needs it (see ListingsMap). Re-creating 24 Leaflet markers on
 * every mouseover would make the whole column stutter.
 *
 * Outside a provider this is inert rather than throwing, so ListingsGrid and
 * BrandListingCard stay usable on /favorites and the profile pages where
 * there's no map to talk to.
 */

interface HoveredListing {
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
}

const NOOP: HoveredListing = { hoveredId: null, setHoveredId: () => {} }

const Ctx = createContext<HoveredListing | null>(null)

export function HoveredListingProvider({ children }: { children: ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const value = useMemo(() => ({ hoveredId, setHoveredId }), [hoveredId])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useHoveredListing(): HoveredListing {
  return useContext(Ctx) ?? NOOP
}

/**
 * Wraps one card in the split-view list. Pointer *and* keyboard focus both
 * drive the link — a hover-only version would leave the map inert for anyone
 * tabbing through the results.
 */
export function HoverLinkedCard({
  id,
  children,
  className = '',
}: {
  id: string
  children: ReactNode
  className?: string
}) {
  const { hoveredId, setHoveredId } = useHoveredListing()
  const active = hoveredId === id

  return (
    <div
      className={`rounded-3xl transition-shadow duration-200 ${
        active ? 'ring-2 ring-navy-deep/70 ring-offset-2 ring-offset-background' : ''
      } ${className}`}
      onMouseEnter={() => setHoveredId(id)}
      onMouseLeave={() => setHoveredId(null)}
      onFocusCapture={() => setHoveredId(id)}
      onBlurCapture={() => setHoveredId(null)}
    >
      {children}
    </div>
  )
}
