import type { Metadata } from 'next'
import { AlertTriangle, Mail } from 'lucide-react'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { SignOutButton } from './SignOutButton'

export const metadata: Metadata = {
  title: 'Account suspended',
  description: 'Your Wroomly account has been suspended.',
  robots: { index: false, follow: false },
}

/**
 * Terminal page reached when middleware redirects a suspended user.
 * Sits OUTSIDE the (app) route group on purpose — no Navbar, no Footer,
 * nothing that could call back into the protected app surface.
 */
export default function SuspendedPage() {
  return (
    <section className="relative isolate overflow-hidden min-h-[100dvh] flex items-center">
      <AtmosphericBackground variant="hero" />

      <div className="relative w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
        <div
          className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mx-auto shadow-glow-maize"
          style={{
            background: 'oklch(0.65 0.15 75)',
            color: 'oklch(0.10 0.05 75)',
          }}
        >
          <AlertTriangle size={24} />
        </div>

        <p className="mt-7 text-[11px] uppercase tracking-[0.22em] text-maize-bright font-semibold">
          Account suspended
        </p>

        <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.5rem)] tracking-tight text-white leading-[1.02]">
          Your access is{' '}
          <span className="italic font-light text-maize-bright">
            paused.
          </span>
        </h1>

        <p className="mt-6 text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
          A Wroomly admin has temporarily suspended this account. You won&rsquo;t
          be able to browse listings, send inquiries, or receive payouts until
          this is resolved.
        </p>

        <p className="mt-3 text-base text-white/75 max-w-xl mx-auto leading-relaxed">
          If you think this is a mistake, reach out and we&rsquo;ll take another
          look.
        </p>

        <div className="mt-9 inline-flex flex-col sm:flex-row items-center gap-3">
          <a
            href="mailto:delghu@umich.edu"
            className="
              group inline-flex items-center gap-2 h-12 px-5 rounded-full
              bg-maize-bright text-navy-deep
              text-sm font-semibold tracking-tight
              shadow-glow-maize
              hover:shadow-glow-maize-strong
              transition-shadow duration-500 active:scale-[0.97]
              focus:outline-none focus-visible:ring-4 focus-visible:ring-maize-bright/30
            "
          >
            <Mail size={16} />
            Email delghu@umich.edu
          </a>
          <SignOutButton />
        </div>
      </div>

      <p className="absolute bottom-6 inset-x-0 text-center text-[11px] text-white/60">
        © {new Date().getFullYear()} Wroomly. Not affiliated with the
        University of Michigan.
      </p>
    </section>
  )
}
