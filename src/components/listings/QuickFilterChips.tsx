'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import {
  DollarSign,
  GraduationCap,
  BedDouble,
  Sofa,
  PawPrint,
  CalendarDays,
} from 'lucide-react'
import { NEAR_CAMPUS_NEIGHBORHOODS } from '@/lib/constants'

interface QuickFilterChipsProps {
  currentFilters: Record<string, string | undefined>
}

/**
 * One-tap preset filter chips above the listings grid.
 *
 * These are the "I just want to browse" entry points for students who
 * won't open a sidebar. Each chip is a multi-key preset (e.g. "Near
 * campus" sets `neighborhood=Central Campus,South University,…` and
 * "Under $1000" sets `max_price=1000`). Tapping again clears that
 * preset's keys.
 *
 * Renders horizontally scrollable on mobile so 6+ chips don't wrap into
 * an awkward two rows.
 */
export function QuickFilterChips({ currentFilters }: QuickFilterChipsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ── Preset definitions ────────────────────────────────────────────
  // Each preset specifies a) what keys/values it sets when activated,
  // and b) how to detect "is this preset currently active?" (so we can
  // highlight the chip and make tapping it again clear the preset).
  const presets = useMemo(
    () => [
      {
        id: 'under-1000',
        label: 'Under $1000',
        icon: DollarSign,
        isActive: () => currentFilters.max_price === '1000',
        apply: { max_price: '1000' },
        clear: ['max_price'],
      },
      {
        id: 'near-campus',
        label: 'Near campus',
        icon: GraduationCap,
        // For near-campus we set a comma-joined list. The browse page's
        // .or() query needs to interpret it; for now this just sets one
        // representative neighborhood (Central Campus) which existing
        // single-neighborhood filtering handles. Multi-select arrives
        // with a later commit.
        isActive: () => currentFilters.neighborhood === 'Central Campus',
        apply: { neighborhood: 'Central Campus' },
        clear: ['neighborhood'],
      },
      {
        id: 'studio',
        label: 'Studios',
        icon: BedDouble,
        isActive: () => currentFilters.bedrooms === '0',
        apply: { bedrooms: '0' },
        clear: ['bedrooms'],
      },
      {
        id: 'furnished',
        label: 'Furnished',
        icon: Sofa,
        isActive: () => currentFilters.furnished === 'true',
        apply: { furnished: 'true' },
        clear: ['furnished'],
      },
      {
        id: 'pets',
        label: 'Pets OK',
        icon: PawPrint,
        isActive: () => currentFilters.pets === 'true',
        apply: { pets: 'true' },
        clear: ['pets'],
      },
      {
        id: 'summer',
        label: 'Summer move-in',
        icon: CalendarDays,
        // Anything available by June counts as a summer move-in.
        // Locks to next year's summer; if you're browsing in Aug you
        // probably mean next May/June anyway.
        isActive: () => {
          const v = currentFilters.available_from
          return !!v && v.endsWith('-05') || v?.endsWith('-06') === true
        },
        apply: () => {
          const now = new Date()
          // If we're before May this year, default to this year's June;
          // otherwise default to next year's May.
          const year =
            now.getUTCMonth() < 4 ? now.getUTCFullYear() : now.getUTCFullYear() + 1
          return { available_from: `${year}-05-01` }
        },
        clear: ['available_from'],
      },
    ],
    [currentFilters],
  )

  // ── Toggle handler ────────────────────────────────────────────────
  const toggle = useCallback(
    (preset: (typeof presets)[number]) => {
      const params = new URLSearchParams(searchParams.toString())
      const isOn = preset.isActive()

      if (isOn) {
        // Clear the keys this preset owns.
        for (const k of preset.clear) params.delete(k)
      } else {
        // Apply preset values. `apply` can be an object or a function
        // returning one (lets a preset compute dynamic values like
        // current year for the summer chip).
        const values =
          typeof preset.apply === 'function' ? preset.apply() : preset.apply
        for (const [k, v] of Object.entries(values)) {
          if (v == null) params.delete(k)
          else params.set(k, String(v))
        }
      }

      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [pathname, searchParams, router],
  )

  return (
    <div
      className="
        -mx-4 sm:mx-0 px-4 sm:px-0
        overflow-x-auto overflow-y-hidden
        scrollbar-none
      "
      style={{ scrollbarWidth: 'none' }}
    >
      <div className="flex items-center gap-2 pb-1 min-w-max sm:flex-wrap sm:min-w-0">
        {presets.map(p => {
          const Icon = p.icon
          const active = p.isActive()
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p)}
              aria-pressed={active}
              className={`
                shrink-0 inline-flex items-center gap-1.5
                h-9 px-3.5 rounded-full text-[13px] font-medium
                transition-all duration-200 ease-out active:scale-[0.97]
                ${
                  active
                    ? 'bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] shadow-[0_4px_14px_oklch(0.22_0.075_256/0.25)]'
                    : 'bg-white/85 backdrop-blur border border-line text-ink-soft hover:border-[oklch(0.84_0.17_85/0.45)] hover:text-ink'
                }
              `}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  active ? 'text-[oklch(0.84_0.17_85)]' : 'text-ink-muted'
                }`}
                strokeWidth={2}
              />
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
