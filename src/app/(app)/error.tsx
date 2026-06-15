'use client'

import { useEffect } from 'react'
import { motion } from 'motion/react'
import { ArrowClockwise, House } from '@phosphor-icons/react/dist/ssr'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { WordReveal } from '@/components/brand/WordReveal'
import { MagneticLinkCta } from '@/components/brand/MagneticLinkCta'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Route-segment error boundary for the (app) shell. Renders an atmospheric
 * recovery screen with retry + go-home CTAs and a one-line digest the user
 * can quote to support.
 */
export default function AppError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to the console in dev; production should route to Sentry/Resend.
    // eslint-disable-next-line no-console
    console.error('(app) route error:', error)
  }, [error])

  return (
    <section className="relative isolate overflow-hidden min-h-[calc(100dvh-4rem)] flex items-center">
      <AtmosphericBackground variant="hero" />

      <div className="relative w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="text-[11px] uppercase tracking-[0.22em] text-[oklch(0.84_0.17_85)] font-semibold mb-5"
        >
          Something broke
        </motion.p>

        <h1 className="font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[0.98] tracking-tight text-white">
          <WordReveal text="We dropped" delay={0.1} />
          <br />
          <WordReveal
            text="the keys."
            delay={0.35}
            accentWords={['the', 'keys.']}
          />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.6 }}
          className="mt-6 text-lg text-white/65 max-w-lg mx-auto leading-relaxed"
        >
          The page hit an unexpected error. Try again — most of the time it’s a
          one-off blip. If it keeps happening, head home and check back in a
          minute.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.75 }}
          className="mt-9 flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto"
        >
          <button
            type="button"
            onClick={reset}
            className="
              group relative inline-flex w-full items-center justify-center gap-2
              h-12 rounded-full overflow-hidden font-semibold tracking-tight text-sm
              bg-[oklch(0.84_0.17_85)] text-[oklch(0.22_0.075_256)]
              shadow-[0_4px_18px_oklch(0.84_0.17_85/0.30)]
              hover:shadow-[0_12px_36px_oklch(0.84_0.17_85/0.45)]
              transition-shadow duration-500 active:scale-[0.97]
              focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.40)]
            "
          >
            <span
              className="absolute inset-0 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ background: 'oklch(0.22 0.075 256)' }}
              aria-hidden
            />
            <span className="relative z-10 inline-flex items-center gap-2 group-hover:text-[oklch(0.84_0.17_85)] transition-colors duration-500">
              <ArrowClockwise size={16} weight="bold" />
              Try again
            </span>
          </button>
          <MagneticLinkCta
            href="/"
            variant="ghost"
            tone="dark"
            size="sm"
            icon={<House size={15} weight="duotone" />}
          >
            Go home
          </MagneticLinkCta>
        </motion.div>

        {error.digest && (
          <p className="mt-10 text-[11px] text-white/35 font-mono">
            error id: {error.digest}
          </p>
        )}
      </div>
    </section>
  )
}
