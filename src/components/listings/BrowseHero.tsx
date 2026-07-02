'use client'

import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { WordReveal } from '@/components/brand/WordReveal'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { ListingsSearch } from './ListingsSearch'
import { ListingsViewToggle } from './ListingsViewToggle'
import { FilterPills } from './FilterPills'

interface BrowseHeroProps {
  totalCount: number
  currentQuery?: string
  filters: Record<string, string | undefined>
  view: 'grid' | 'map'
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

export function BrowseHero({ totalCount, currentQuery, filters, view }: BrowseHeroProps) {
  return (
    <section className="relative isolate overflow-hidden -mt-16 pt-16">
      <AtmosphericBackground variant="hero" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12">
        {/* Live counter pill — entrance from left */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.07]"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
            <span className="rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <Sparkles className="w-3.5 h-3.5 text-[oklch(0.84_0.17_85)]" />
          <span className="text-sm text-white/65 font-medium">
            <span className="text-white">{totalCount}</span>{' '}
            {totalCount === 1 ? 'place' : 'places'} available · Ann Arbor
          </span>
        </motion.div>

        {/* Headline — staggered word reveal */}
        <h1 className="font-display text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.95] tracking-tight text-white mt-7 max-w-3xl">
          <WordReveal text="Find your" delay={0.2} />
          <br />
          <WordReveal text="next place." delay={0.45} accentWords={['next', 'place.']} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.7 }}
          className="mt-6 text-base sm:text-lg text-white/70 leading-relaxed max-w-xl"
        >
          Sublets from verified U&nbsp;of&nbsp;M students. Filter by
          neighborhood, dates, price — the right listing is a couple of clicks away.
        </motion.p>

        {/* Search + view toggle */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.85 }}
          className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <ListingsSearch currentQuery={currentQuery} />
          <ListingsViewToggle view={view} />
        </motion.div>

        {/* Filter pills with layoutId sliding indicator */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 1.0 }}
          className="mt-5"
        >
          <FilterPills filters={filters} />
        </motion.div>
      </div>
    </section>
  )
}
