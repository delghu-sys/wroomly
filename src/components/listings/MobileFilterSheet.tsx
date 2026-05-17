'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { SlidersHorizontal } from '@phosphor-icons/react/dist/ssr'
import { ListingsFilters } from './ListingsFilters'

interface MobileFilterSheetProps {
  neighborhoods: string[]
  residences: string[]
  propertyTypes: { value: string; label: string }[]
  currentFilters: Record<string, string | undefined>
  activeFilterCount: number
}

export function MobileFilterSheet({
  neighborhoods,
  residences,
  propertyTypes,
  currentFilters,
  activeFilterCount,
}: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // A11y wiring: lock body scroll, ESC closes, focus jumps to the close
  // button on open and returns to the trigger on close.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const trigger = triggerRef.current

    // Focus the close button on the next tick so the sheet has mounted.
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 30)

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(focusTimer)
      // Return focus to the trigger after the sheet unmounts.
      trigger?.focus()
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-filter-sheet"
        className="lg:hidden inline-flex items-center gap-2 h-9 px-4 rounded-full border border-line bg-white/70 backdrop-blur text-sm font-medium text-ink hover:border-[oklch(0.84_0.17_85/0.40)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_1px_2px_oklch(0_0_0/0.04)] active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.30)]"
      >
        <SlidersHorizontal size={14} weight="bold" />
        Filters
        {activeFilterCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-[oklch(0.10_0.02_260)] text-[oklch(0.84_0.17_85)] text-[10px] font-bold flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in cursor-default"
          />
          <div
            id="mobile-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-heading"
            className="fixed inset-y-0 left-0 z-50 w-[320px] max-w-[85vw] bg-background overflow-y-auto animate-fade-up shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-background/95 backdrop-blur border-b border-line">
              <h2
                id="mobile-filter-heading"
                className="font-display text-lg text-ink"
              >
                Filters
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="w-8 h-8 rounded-full bg-ink-muted/10 flex items-center justify-center hover:bg-ink-muted/20 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.30)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <ListingsFilters
                neighborhoods={neighborhoods}
                residences={residences}
                propertyTypes={propertyTypes}
                currentFilters={currentFilters}
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}
