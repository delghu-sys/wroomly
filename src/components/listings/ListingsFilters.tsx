'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'

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

  return (
    <div className="bg-white rounded-2xl border p-5 space-y-5 sticky top-20">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        {hasFilters && (
          <button onClick={clearAll} className="text-sm text-blue-600 hover:underline">
            Clear all
          </button>
        )}
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label>Listing type</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: '', label: 'Any' },
            { value: 'sublet', label: 'Sublet' },
            { value: 'swap', label: 'Swap' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => updateFilter('type', opt.value || undefined)}
              className={`text-sm py-1.5 px-2 rounded-lg border transition-colors ${
                (currentFilters.type ?? '') === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Property type */}
      <div className="space-y-2">
        <Label>Property type</Label>
        <Select
          value={currentFilters.property_type ?? ''}
          onValueChange={v =>
            updateFilters({
              property_type: v || undefined,
              // residence sub-filter only makes sense for apartments
              residence_name: v === 'apartment' ? currentFilters.residence_name : undefined,
            })
          }
        >
          <SelectTrigger>
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

      {/* Residence sub-filter (apartments / complexes) */}
      {currentFilters.property_type === 'apartment' && (
        <div className="space-y-2">
          <Label>Residence / complex</Label>
          <Select
            value={currentFilters.residence_name ?? ''}
            onValueChange={v => updateFilter('residence_name', v || undefined)}
          >
            <SelectTrigger>
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

      <Separator />

      {/* Neighborhood */}
      <div className="space-y-2">
        <Label>Neighborhood</Label>
        <Select
          value={currentFilters.neighborhood ?? ''}
          onValueChange={v => updateFilter('neighborhood', v || undefined)}
        >
          <SelectTrigger>
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

      <Separator />

      {/* Available from (single month/year picker) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Available from</Label>
          {currentFilters.available_from && (
            <button
              type="button"
              onClick={() => updateFilter('available_from', undefined)}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        {(() => {
          const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
          const now = new Date()
          // 18 months starting from this month
          const options = Array.from({ length: 18 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            return { value: `${y}-${m}-01`, label: `${monthNames[d.getMonth()]} ${y}` }
          })
          // Make sure currently-selected value is in the list even if past
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
              <SelectTrigger><SelectValue placeholder="Any month" /></SelectTrigger>
              <SelectContent>
                {options.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        })()}
        <p className="text-xs text-ink-muted">
          Shows places available by this month.
        </p>
      </div>

      <Separator />

      {/* Price range */}
      <div className="space-y-2">
        <Label>Monthly price ($)</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min"
            defaultValue={currentFilters.min_price}
            onBlur={e => updateFilter('min_price', e.target.value || undefined)}
          />
          <Input
            type="number"
            placeholder="Max"
            defaultValue={currentFilters.max_price}
            onBlur={e => updateFilter('max_price', e.target.value || undefined)}
          />
        </div>
      </div>

      <Separator />

      {/* Bedrooms */}
      <div className="space-y-2">
        <Label>Bedrooms</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: '', label: 'Any' },
            { value: '0', label: 'Studio' },
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => updateFilter('bedrooms', opt.value || undefined)}
              className={`text-sm py-1.5 rounded-lg border transition-colors ${
                (currentFilters.bedrooms ?? '') === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Checkboxes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="furnished"
            checked={currentFilters.furnished === 'true'}
            onCheckedChange={v => updateFilter('furnished', v ? 'true' : undefined)}
          />
          <Label htmlFor="furnished" className="cursor-pointer">Furnished</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="pets"
            checked={currentFilters.pets === 'true'}
            onCheckedChange={v => updateFilter('pets', v ? 'true' : undefined)}
          />
          <Label htmlFor="pets" className="cursor-pointer">Pets allowed</Label>
        </div>
      </div>
    </div>
  )
}
