'use client'

import { useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center gap-2 h-9 px-4 rounded-full border border-line bg-white/70 backdrop-blur text-sm font-medium text-ink hover:border-[oklch(0.84_0.17_85/0.40)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_1px_2px_oklch(0_0_0/0.04)] active:scale-[0.97]"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filters
        {activeFilterCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-[oklch(0.10_0.02_260)] text-[oklch(0.84_0.17_85)] text-[10px] font-bold flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[320px] max-w-[85vw] bg-background overflow-y-auto animate-fade-up shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-background/95 backdrop-blur border-b border-line">
              <h2 className="font-display text-lg text-ink">Filters</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-ink-muted/10 flex items-center justify-center hover:bg-ink-muted/20 transition-colors"
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
