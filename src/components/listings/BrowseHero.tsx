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

/**
 * Browse hero. Entrance animations are CSS (`animate-fade-up` + delays),
 * NOT motion/react, on purpose: this hero contains the page's LCP element
 * and the search box — a motion entrance server-renders them at opacity:0,
 * leaving the whole hero invisible (and search unusable) until the bundle
 * hydrates, which took ~7s on a throttled phone (Lighthouse mobile,
 * 2026-07 perf pass 2). CSS animations start when styles parse, so the
 * hero appears at first paint. This also lets the component render on the
 * server — the interactive children below are their own client islands.
 */
export function BrowseHero({ totalCount, currentQuery, filters, view }: BrowseHeroProps) {
  return (
    <section className="relative isolate overflow-hidden -mt-16 pt-16">
      <AtmosphericBackground variant="hero" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12">
        {/* Live counter pill */}
        <div
          className="animate-fade-up inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.07]"
          style={{ animationDelay: '0.1s' }}
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
        </div>

        {/* Headline — staggered word reveal (CSS) */}
        <h1 className="font-display text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.95] tracking-tight text-white mt-7 max-w-3xl">
          <WordReveal text="Find your" delay={0.2} />
          <br />
          <WordReveal text="next place." delay={0.45} accentWords={['next', 'place.']} />
        </h1>

        <p
          className="animate-fade-up mt-6 text-base sm:text-lg text-white/70 leading-relaxed max-w-xl"
          style={{ animationDelay: '0.55s' }}
        >
          Sublets from verified U&nbsp;of&nbsp;M students. Filter by
          neighborhood, dates, price — the right listing is a couple of clicks away.
        </p>

        {/* Search + view toggle */}
        <div
          className="animate-fade-up mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          style={{ animationDelay: '0.7s' }}
        >
          <ListingsSearch currentQuery={currentQuery} />
          <ListingsViewToggle view={view} />
        </div>

        {/* Filter pills with layoutId sliding indicator */}
        <div className="animate-fade-up mt-5" style={{ animationDelay: '0.85s' }}>
          <FilterPills filters={filters} />
        </div>
      </div>
    </section>
  )
}
