'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import { useCallback } from 'react'

interface FilterPillsProps {
  filters: Record<string, string | undefined>
}

type Pill = {
  label: string
  /** Test if this pill is the active one given current filters */
  isActive: (f: Record<string, string | undefined>) => boolean
  /** Patch to apply when this pill is clicked */
  patch: (f: Record<string, string | undefined>) => Record<string, string | undefined>
}

const pills: Pill[] = [
  {
    label: 'All',
    isActive: f => !f.type && f.furnished !== 'true' && f.pets !== 'true',
    patch: () => ({ type: undefined, furnished: undefined, pets: undefined }),
  },
  {
    label: 'Sublets',
    isActive: f => f.type === 'sublet',
    patch: () => ({ type: 'sublet', furnished: undefined, pets: undefined }),
  },
  {
    label: 'Swaps',
    isActive: f => f.type === 'swap',
    patch: () => ({ type: 'swap', furnished: undefined, pets: undefined }),
  },
  {
    label: 'Furnished',
    isActive: f => f.furnished === 'true',
    patch: f => ({ furnished: f.furnished === 'true' ? undefined : 'true' }),
  },
  {
    label: 'Pets OK',
    isActive: f => f.pets === 'true',
    patch: f => ({ pets: f.pets === 'true' ? undefined : 'true' }),
  },
]

const spring = { type: 'spring' as const, stiffness: 400, damping: 32 }

export function FilterPills({ filters }: FilterPillsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const apply = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      const merged: Record<string, string | undefined> = { ...filters, ...patch }
      params.delete('type')
      params.delete('furnished')
      params.delete('pets')
      for (const [k, v] of Object.entries(merged)) {
        if (v) params.set(k, v)
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [filters, pathname, searchParams, router]
  )

  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-white/[0.05] backdrop-blur border border-white/[0.07] w-fit flex-wrap">
      {pills.map(pill => {
        const active = pill.isActive(filters)
        return (
          <button
            key={pill.label}
            type="button"
            onClick={() => apply(pill.patch(filters))}
            className="relative inline-flex items-center h-9 px-4 text-sm font-medium transition-colors duration-300 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.30)]"
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="filter-pill-active"
                transition={spring}
                className="absolute inset-0 rounded-full bg-[oklch(0.84_0.17_85)] shadow-[0_4px_18px_oklch(0.84_0.17_85/0.35)]"
              />
            )}
            <span
              className={`relative z-10 ${
                active ? 'text-[oklch(0.10_0.02_260)]' : 'text-white/65 hover:text-white'
              }`}
            >
              {pill.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
