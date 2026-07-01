'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import { MapPin, Calendar, DollarSign, Search, ArrowRight } from 'lucide-react'

/**
 * Homepage hero search — the redesign's 3-field pill (Where / Dates / Budget),
 * wired to our real /listings route. Mobile: a stacked white card. Desktop
 * (≥680px): a single horizontal pill with the maize Search button nested at the
 * right. Quick-filter chips below deep-link to pre-filtered /listings views.
 *
 * Field → query param mapping matches how /listings parses searchParams:
 *   Where  → q (keyword: title/description/neighborhood/residence)
 *   Dates  → available_from (listings available on/before the move-in date)
 *   Budget → max_price (whole dollars)
 */

const ease = [0.22, 1, 0.36, 1] as const

// Quick chips → the exact filters /listings understands.
const CHIPS: { label: string; href: string }[] = [
  { label: 'Near Central Campus', href: '/listings?neighborhood=Central+Campus' },
  { label: 'Summer sublet', href: '/listings?type=sublet' },
  { label: 'Under $1,000', href: '/listings?max_price=1000' },
  { label: 'Furnished', href: '/listings?furnished=true' },
]

export function HomeSearch() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [budget, setBudget] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    const loc = location.trim()
    if (loc) params.set('q', loc)
    if (date) params.set('available_from', date)
    const b = budget.replace(/[^\d]/g, '')
    if (b) params.set('max_price', b)
    const qs = params.toString()
    router.push(qs ? `/listings?${qs}` : '/listings')
  }

  const fieldCls =
    'flex items-center gap-3 px-5 py-4 border-b border-line cursor-text transition-colors hover:bg-[oklch(0.97_0.004_85)] ' +
    'min-[680px]:flex-1 min-[680px]:flex-col min-[680px]:items-start min-[680px]:justify-center min-[680px]:gap-[0.1rem] ' +
    'min-[680px]:px-[1.375rem] min-[680px]:py-0 min-[680px]:border-b-0 min-[680px]:border-r min-[680px]:border-line'
  const labelCls =
    'font-display text-[0.625rem] font-bold uppercase tracking-[0.09em] text-ink-muted mb-[0.1rem]'
  const inputCls =
    'w-full bg-transparent border-none outline-none text-ink text-[0.9375rem] min-[680px]:text-[0.875rem] font-medium placeholder:text-ink-muted placeholder:font-normal'

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease, delay: 0.3 }}
      className="w-full max-w-[44rem]"
    >
      <form
        onSubmit={submit}
        role="search"
        aria-label="Search listings"
        className="
          text-left bg-white overflow-hidden rounded-[1.375rem]
          shadow-[0_8px_48px_oklch(0_0_0/0.32),0_2px_12px_oklch(0_0_0/0.14)]
          min-[680px]:flex min-[680px]:items-stretch min-[680px]:h-[4.25rem]
          min-[680px]:rounded-full min-[680px]:pl-0 min-[680px]:pr-[0.375rem] min-[680px]:py-[0.375rem]
          min-[680px]:shadow-[0_12px_56px_oklch(0_0_0/0.36),0_3px_16px_oklch(0_0_0/0.16)]
        "
      >
        <div className="flex flex-col min-[680px]:flex-row min-[680px]:flex-1">
          {/* Where */}
          <label className={`${fieldCls} min-[680px]:rounded-l-full min-[680px]:pl-7`}>
            <MapPin size={17} className="shrink-0 text-ink-muted min-[680px]:hidden" />
            <span className="flex-1 min-w-0 min-[680px]:w-full">
              <span className={`block ${labelCls}`}>Where</span>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Near Central Campus…"
                aria-label="Location"
                className={inputCls}
              />
            </span>
          </label>

          {/* Dates */}
          <label className={fieldCls}>
            <Calendar size={17} className="shrink-0 text-ink-muted min-[680px]:hidden" />
            <span className="flex-1 min-w-0 min-[680px]:w-full">
              <span className={`block ${labelCls}`}>Dates</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                aria-label="Move-in date"
                className={inputCls}
              />
            </span>
          </label>

          {/* Budget */}
          <label className={`${fieldCls} border-b-0`}>
            <DollarSign size={17} className="shrink-0 text-ink-muted min-[680px]:hidden" />
            <span className="flex-1 min-w-0 min-[680px]:w-full">
              <span className={`block ${labelCls}`}>Budget</span>
              <input
                type="text"
                inputMode="numeric"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="Any price"
                aria-label="Max budget per month"
                className={inputCls}
              />
            </span>
          </label>
        </div>

        {/* Search button — full-width row on mobile, nested pill on desktop */}
        <div className="px-[1.125rem] pt-[0.875rem] pb-[1.125rem] min-[680px]:flex min-[680px]:items-center min-[680px]:p-0">
          <button
            type="submit"
            className="
              w-full min-[680px]:w-auto h-[3.25rem] min-[680px]:h-[3.375rem] min-[680px]:px-7
              rounded-full bg-maize text-navy font-bold text-[1.0625rem] min-[680px]:text-[0.9375rem]
              inline-flex items-center justify-center gap-2 shrink-0
              transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
              hover:-translate-y-px hover:shadow-[0_8px_28px_oklch(0.86_0.17_92/0.42)] active:scale-[0.97]
            "
          >
            <span className="min-[680px]:hidden">Search listings</span>
            <span className="hidden min-[680px]:inline">Search</span>
            <Search size={15} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      </form>

      {/* Browse everything, no filters — for people who don't want to search */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.35 }}
        className="mt-4 text-center"
      >
        <Link
          href="/listings"
          className="
            group inline-flex items-center gap-2 h-11 px-6 rounded-full
            border border-white/25 bg-white/[0.07] text-white text-[0.9375rem] font-semibold
            transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
            hover:bg-white/[0.15] hover:border-white/45 hover:-translate-y-px
          "
        >
          Browse all listings
          <ArrowRight
            size={15}
            strokeWidth={2.5}
            className="transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden
          />
        </Link>
      </motion.div>

      {/* Quick filter chips */}
      <motion.nav
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.4 }}
        aria-label="Quick filters"
        className="mt-[1.375rem] flex flex-wrap justify-center gap-2"
      >
        {CHIPS.map(c => (
          <Link
            key={c.label}
            href={c.href}
            className="
              rounded-full px-[0.9375rem] py-[0.375rem] text-[0.8125rem] font-medium whitespace-nowrap
              bg-white/[0.07] border border-white/[0.14] text-white/[0.72]
              transition-[transform,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]
              hover:-translate-y-px hover:bg-white/[0.13] hover:border-white/[0.24] hover:text-white
            "
          >
            {c.label}
          </Link>
        ))}
      </motion.nav>
    </motion.div>
  )
}
