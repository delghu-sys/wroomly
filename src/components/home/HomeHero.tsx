'use client'

import { motion, useReducedMotion } from 'motion/react'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { HomeSearch } from './HomeSearch'

/**
 * Homepage hero (redesign) — full-viewport navy search hero. Sits under the
 * global sticky Navbar (`-mt-16 pt-16` pulls it up so the transparent navbar
 * overlays the hero, matching the design's transparent → glassy-on-scroll
 * header). Reuses <AtmosphericBackground> for the mesh blobs + noise.
 */

const ease = [0.22, 1, 0.36, 1] as const

export function HomeHero() {
  const reduce = useReducedMotion()
  const up = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease, delay },
  })

  return (
    <section className="relative isolate overflow-hidden -mt-16 pt-16 min-h-[100dvh] flex flex-col items-center justify-center">
      <AtmosphericBackground variant="hero" />

      <div className="relative z-10 w-full max-w-3xl px-6 pt-14 pb-20 flex flex-col items-center text-center">
        {/* Location badge */}
        <motion.div
          {...up(0.06)}
          className="inline-flex items-center gap-[0.45rem] rounded-full pl-[0.55rem] pr-[0.8rem] py-[0.28rem] mb-6
            bg-[oklch(0.86_0.17_92/0.10)] border border-[oklch(0.86_0.17_92/0.22)] text-maize
            font-display text-[0.675rem] font-bold uppercase tracking-[0.08em]"
        >
          <span className="w-[5px] h-[5px] rounded-full bg-maize shrink-0" aria-hidden />
          Ann Arbor · University of Michigan
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...up(0.14)}
          className="font-display font-bold text-white text-balance mb-4
            text-[clamp(2.75rem,10vw,5rem)] tracking-[-0.045em] leading-[1.0]"
        >
          Find your Ann Arbor{' '}
          <em className="italic font-semibold text-[oklch(0.74_0.16_85)]">sublet.</em>
        </motion.h1>

        {/* Subline */}
        <motion.p
          {...up(0.22)}
          className="text-[1.0625rem] leading-[1.65] text-white/50 text-pretty mb-10"
        >
          Every student sublease and rental, in one place. Free.
        </motion.p>

        {/* Search bar + quick chips (wired to /listings) */}
        <HomeSearch />
      </div>
    </section>
  )
}
