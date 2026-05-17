'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { SlidersHorizontal } from 'lucide-react'

interface ListingsFiltersProps {
  neighborhoods: string[]
  residences: string[]
  propertyTypes: { value: string; label: string }[]
  currentFilters: Record<string, string | undefined>
}

export function ListingsFilters({
  neighborhoods,
  residences,
  propertyTypes,
  currentFilters,
}: ListingsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()

  const updateFilters = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams()
      const merged = { ...currentFilters, ...patch }
      for (const [k, v] of Object.entries(merged)) {
        if (v) params.set(k, v)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [currentFilters, pathname, router]
  )

  const updateFilter = useCallback(
    (key: string, value: string | undefined) => updateFilters({ [key]: value }),
    [updateFilters]
  )

  const clearAll = () => router.push(pathname)

  const hasFilters = Object.values(currentFilters).some(Boolean)

  const tinyLabel =
    'text-[10px] uppercase tracking-[0.15em] text-ink-muted font-semibold'

  return (
    <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 p-5 space-y-5 sticky top-20 shadow-[0_2px_16px_oklch(0_0_0/0.04)]">
      {/* Soft inner highlight for glass refraction */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{ boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.7)' }}
        aria-hidden
      />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[oklch(0.84_0.17_85/0.12)] flex items-center justify-center">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[oklch(0.45_0.13_85)]" />
          </div>
          <h3 className="font-display text-base text-ink tracking-tight">Filters</h3>
        </div>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-[oklch(0.45_0.13_85)] font-medium hover:text-ink transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="relative space-y-2">
        <Label className={tinyLabel}>Sort by</Label>
        <Select
          value={currentFilters.sort ?? 'newest'}
          onValueChange={v => updateFilter('sort', !v || v === 'newest' ? undefined : v)}
        >
          <SelectTrigger className="h-10 rounded-xl border-line bg-white/80">
            <SelectValue placeholder="Newest first" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="price_asc">Price: low to high</SelectItem>
            <SelectItem value="price_desc">Price: high to low</SelectItem>
            <SelectItem value="date_asc">Available soonest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator className="bg-line/70" />

      {/* Type */}
      <div className="relative space-y-2">
        <Label className={tinyLabel}>Listing type</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: '', label: 'Any' },
            { value: 'sublet', label: 'Sublet' },
            { value: 'swap', label: 'Swap' },
          ].map(opt => {
            const active = (currentFilters.type ?? '') === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => updateFilter('type', opt.value || undefined)}
                className={`text-sm py-2 px-2 rounded-xl border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] ${
                  active
                    ? 'bg-[oklch(0.10_0.02_260)] text-[oklch(0.84_0.17_85)] border-[oklch(0.10_0.02_260)] shadow-[0_4px_16px_oklch(0.10_0.02_260/0.30)]'
                    : 'text-ink-soft border-line bg-white/60 hover:border-[oklch(0.84_0.17_85/0.40)] hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <Separator className="bg-line/70" />

      {/* Property type */}
      <div className="relative space-y-2">
        <Label className={tinyLabel}>Property type</Label>
        <Select
          value={currentFilters.property_type ?? ''}
          onValueChange={v =>
            updateFilters({
              property_type: v || undefined,
              residence_name: v === 'apartment' ? currentFilters.residence_name : undefined,
            })
          }
        >
          <SelectTrigger className="h-10 rounded-xl border-line bg-white/80">
            <SelectValue placeholder="Any type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any type</SelectItem>
            {propertyTypes.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Residence sub-filter */}
      {currentFilters.property_type === 'apartment' && (
        <div className="relative space-y-2">
          <Label className={tinyLabel}>Residence / complex</Label>
          <Select
            value={currentFilters.residence_name ?? ''}
            onValueChange={v => updateFilter('residence_name', v || undefined)}
          >
            <SelectTrigger className="h-10 rounded-xl border-line bg-white/80">
              <SelectValue placeholder="Any residence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any residence</SelectItem>
              {residences.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator className="bg-line/70" />

      {/* Neighborhood */}
      <div className="relative space-y-2">
        <Label className={tinyLabel}>Neighborhood</Label>
        <Select
          value={currentFilters.neighborhood ?? ''}
          onValueChange={v => updateFilter('neighborhood', v || undefined)}
        >
          <SelectTrigger className="h-10 rounded-xl border-line bg-white/80">
            <SelectValue placeholder="Any neighborhood" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any neighborhood</SelectItem>
            {neighborhoods.map(n => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator className="bg-line/70" />

      {/* Available from */}
      <div className="relative space-y-2">
        <div className="flex items-center justify-between">
          <Label className={tinyLabel}>Available from</Label>
          {currentFilters.available_from && (
            <button
              type="button"
              onClick={() => updateFilter('available_from', undefined)}
              className="text-xs text-[oklch(0.45_0.13_85)] font-medium hover:text-ink transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {(() => {
          const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
          const now = new Date()
          const options = Array.from({ length: 18 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            return { value: `${y}-${m}-01`, label: `${monthNames[d.getMonth()]} ${y}` }
          })
          const current = currentFilters.available_from ?? ''
          if (current && !options.some(o => o.value === current)) {
            const [y, m] = current.split('-').map(Number)
            options.unshift({
              value: current,
              label: `${monthNames[(m - 1) || 0]} ${y}`,
            })
          }
          return (
            <Select
              value={current}
              onValueChange={v => updateFilter('available_from', v || undefined)}
            >
              <SelectTrigger className="h-10 rounded-xl border-line bg-white/80">
                <SelectValue placeholder="Any month" />
              </SelectTrigger>
              <SelectContent>
                {options.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        })()}
        <p className="text-xs text-ink-muted leading-relaxed">
          Shows places available by this month.
        </p>
      </div>

      <Separator className="bg-line/70" />

      {/* Price range */}
      <div className="relative space-y-2">
        <Label className={tinyLabel}>Monthly price ($)</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min"
            defaultValue={currentFilters.min_price}
            onBlur={e => updateFilter('min_price', e.target.value || undefined)}
            className="h-10 rounded-xl border-line bg-white/80"
          />
          <Input
            type="number"
            placeholder="Max"
            defaultValue={currentFilters.max_price}
            onBlur={e => updateFilter('max_price', e.target.value || undefined)}
            className="h-10 rounded-xl border-line bg-white/80"
          />
        </div>
      </div>

      <Separator className="bg-line/70" />

      {/* Bedrooms */}
      <div className="relative space-y-2">
        <Label className={tinyLabel}>Bedrooms</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: '', label: 'Any' },
            { value: '0', label: 'Studio' },
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
          ].map(opt => {
            const active = (currentFilters.bedrooms ?? '') === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => updateFilter('bedrooms', opt.value || undefined)}
                className={`text-sm py-2 rounded-xl border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] ${
                  active
                    ? 'bg-[oklch(0.10_0.02_260)] text-[oklch(0.84_0.17_85)] border-[oklch(0.10_0.02_260)] shadow-[0_4px_16px_oklch(0.10_0.02_260/0.30)]'
                    : 'text-ink-soft border-line bg-white/60 hover:border-[oklch(0.84_0.17_85/0.40)] hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <Separator className="bg-line/70" />

      {/* Checkboxes */}
      <div className="relative space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="furnished"
            checked={currentFilters.furnished === 'true'}
            onCheckedChange={v => updateFilter('furnished', v ? 'true' : undefined)}
            className="data-[state=checked]:bg-[oklch(0.10_0.02_260)] data-[state=checked]:border-[oklch(0.10_0.02_260)]"
          />
          <Label htmlFor="furnished" className="cursor-pointer text-sm text-ink-soft">Furnished</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="pets"
            checked={currentFilters.pets === 'true'}
            onCheckedChange={v => updateFilter('pets', v ? 'true' : undefined)}
            className="data-[state=checked]:bg-[oklch(0.10_0.02_260)] data-[state=checked]:border-[oklch(0.10_0.02_260)]"
          />
          <Label htmlFor="pets" className="cursor-pointer text-sm text-ink-soft">Pets allowed</Label>
        </div>
      </div>
    </div>
  )
}
