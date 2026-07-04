import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { HomeSearch } from './HomeSearch'

/**
 * Homepage hero (redesign) — full-viewport navy search hero. Sits under the
 * global sticky Navbar (`-mt-16 pt-16` pulls it up so the transparent navbar
 * overlays the hero, matching the design's transparent → glassy-on-scroll
 * header). Reuses <AtmosphericBackground> for the mesh blobs + noise.
 *
 * Entrance animations are CSS (`animate-fade-up` + delays), NOT motion:
 * the headline is the homepage LCP element, and a motion entrance
 * server-renders it at opacity:0 — the hero stayed invisible until the
 * bundle hydrated (~7s on a throttled phone, Lighthouse mobile 2026-07).
 * CSS animations start when styles parse, so the hero shows at first
 * paint, and this component now renders on the server (HomeSearch below
 * is its own client island). Reduced-motion is handled by the global CSS
 * rules (animation:none leaves elements at their natural visible state).
 */
export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden -mt-16 pt-16 min-h-[100dvh] flex flex-col items-center justify-center">
      <AtmosphericBackground variant="hero" />

      <div className="relative z-10 w-full max-w-3xl px-6 pt-14 pb-20 flex flex-col items-center text-center">
        {/* Location badge */}
        <div
          className="animate-fade-up inline-flex items-center gap-[0.45rem] rounded-full pl-[0.55rem] pr-[0.8rem] py-[0.28rem] mb-6
            bg-[oklch(0.86_0.17_92/0.10)] border border-[oklch(0.86_0.17_92/0.22)] text-maize
            font-display text-[0.675rem] font-bold uppercase tracking-[0.08em]"
          style={{ animationDelay: '0.06s' }}
        >
          <span className="w-[5px] h-[5px] rounded-full bg-maize shrink-0" aria-hidden />
          Ann Arbor · University of Michigan
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-up font-display font-bold text-white text-balance mb-4
            text-[clamp(2.75rem,10vw,5rem)] tracking-[-0.045em] leading-[1.0]"
          style={{ animationDelay: '0.14s' }}
        >
          Find your Ann Arbor{' '}
          <em className="italic font-semibold text-[oklch(0.74_0.16_85)]">sublet.</em>
        </h1>

        {/* Subline */}
        <p
          className="animate-fade-up text-[1.0625rem] leading-[1.65] text-white/50 text-pretty mb-10"
          style={{ animationDelay: '0.22s' }}
        >
          Every student sublease and rental, in one place. Free.
        </p>

        {/* Search bar + quick chips (wired to /listings) */}
        <HomeSearch />
      </div>
    </section>
  )
}
