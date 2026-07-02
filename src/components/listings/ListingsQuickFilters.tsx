'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'

interface ListingsQuickFiltersProps {
  currentFilters: Record<string, string | undefined>
  totalCount: number
}

const FILTER_LABELS: Record<string, (v: string) => string> = {
  type: () => 'Sublet',
  neighborhood: v => v,
  property_type: v => v.charAt(0).toUpperCase() + v.slice(1),
  residence_name: v => v,
  bedrooms: v => v === '0' ? 'Studio' : `${v} bed`,
  furnished: () => 'Furnished',
  pets: () => 'Pets OK',
  min_price: v => `$${v}+ /mo`,
  max_price: v => `Under $${v}/mo`,
  available_from: v => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const [y, m] = v.split('-').map(Number)
    return `From ${months[(m - 1) || 0]} ${y}`
  },
  q: v => `"${v}"`,
}

export function ListingsQuickFilters({ currentFilters, totalCount }: ListingsQuickFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Filters whose value is a comma-joined multi-select — each pick gets its own
  // removable chip, and removing one drops only that value.
  const MULTI_KEYS = new Set(['neighborhood', 'bedrooms'])

  // Remove a filter entirely, or (for multi-select) just one of its values.
  const removeFilter = useCallback((key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value != null && MULTI_KEYS.has(key)) {
      const remaining = (params.get(key) ?? '').split(',').filter(v => v && v !== value)
      if (remaining.length) params.set(key, remaining.join(','))
      else params.delete(key)
    } else {
      params.delete(key)
    }
    // Changing the result set invalidates the current page number — a user on
    // page 6 who drops a filter would otherwise land on an out-of-range page.
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams, router])

  const clearAll = useCallback(() => {
    router.push(pathname)
  }, [pathname, router])

  // Only known filter keys become chips — currentFilters carries every raw
  // query param, so pagination (?page=2) or junk params would otherwise render
  // as mystery removable chips for filters the server never applied. Multi
  // filters expand into one chip per selected value.
  const activeFilters = Object.entries(currentFilters)
    .filter(([k, v]) => v && k in FILTER_LABELS)
    .flatMap(([k, v]) =>
      MULTI_KEYS.has(k)
        ? v!.split(',').filter(Boolean).map(val => ({ key: k, value: val, label: FILTER_LABELS[k](val) }))
        : [{ key: k, value: undefined as string | undefined, label: FILTER_LABELS[k](v!) }],
    )

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Results count — keyed on totalCount so each new value springs in
          from below. AnimatePresence handles the outgoing number. */}
      <p className="text-sm text-ink-muted inline-flex items-baseline gap-1">
        <span
          className="relative inline-block overflow-hidden align-baseline"
          style={{ minWidth: '1.5ch' }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={totalCount}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="font-display font-semibold text-ink tabular-nums inline-block"
            >
              {totalCount}
            </motion.span>
          </AnimatePresence>
        </span>
        {totalCount === 1 ? 'listing' : 'listings'}
      </p>

      {/* Active filter badges */}
      {activeFilters.map(({ key, value, label }) => (
        <button
          key={key + (value ?? '')}
          onClick={() => removeFilter(key, value)}
          className="inline-flex items-center gap-1.5 h-7 pl-3 pr-2 rounded-full bg-[oklch(0.84_0.17_85/0.15)] text-[oklch(0.32_0.10_85)] text-xs font-medium hover:bg-[oklch(0.84_0.17_85/0.25)] transition-colors duration-300 group active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.30)]"
        >
          {label}
          <X className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}

      {activeFilters.length > 1 && (
        <button
          onClick={clearAll}
          className="text-xs text-ink-muted hover:text-[oklch(0.45_0.13_85)] font-medium transition-colors focus:outline-none focus-visible:underline underline-offset-4"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
