'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { X } from 'lucide-react'

interface ListingsQuickFiltersProps {
  currentFilters: Record<string, string | undefined>
  totalCount: number
}

const FILTER_LABELS: Record<string, (v: string) => string> = {
  type: v => v === 'sublet' ? 'Sublet' : 'Swap',
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

  const removeFilter = useCallback((key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }, [pathname, searchParams, router])

  const clearAll = useCallback(() => {
    router.push(pathname)
  }, [pathname, router])

  const activeFilters = Object.entries(currentFilters)
    .filter(([k, v]) => v && k !== 'sort' && k !== 'view')
    .map(([k, v]) => ({
      key: k,
      label: FILTER_LABELS[k]?.(v!) ?? v!,
    }))

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Results count */}
      <p className="text-sm text-ink-muted">
        <span className="font-display font-semibold text-ink">{totalCount}</span>{' '}
        {totalCount === 1 ? 'listing' : 'listings'}
      </p>

      {/* Active filter badges */}
      {activeFilters.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => removeFilter(key)}
          className="inline-flex items-center gap-1.5 h-7 pl-3 pr-2 rounded-full bg-[oklch(0.84_0.17_85/0.15)] text-[oklch(0.32_0.10_85)] text-xs font-medium hover:bg-[oklch(0.84_0.17_85/0.25)] transition-colors duration-300 group active:scale-[0.97]"
        >
          {label}
          <X className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}

      {activeFilters.length > 1 && (
        <button
          onClick={clearAll}
          className="text-xs text-ink-muted hover:text-[oklch(0.45_0.13_85)] font-medium transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
