'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight, Mail } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { WaitlistForm } from './WaitlistForm'

const EASE = [0.22, 1, 0.36, 1] as const
// Both supplier CTAs point at the public AI-import entry — it matches the
// "screenshot your post, our AI builds the listing" copy and needs no account.
const SUPPLIER_HREF = '/import-listing'
const NAVY = 'oklch(0.22 0.075 256)'

/** Inline Instagram glyph — lucide-react dropped brand icons. */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function rise(delay: number) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE, delay },
  }
}

export function ComingSoonLanding() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="bg-background">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 h-16 transition-colors duration-300 ${
          scrolled
            ? 'bg-background/84 backdrop-blur-xl border-b border-border'
            : 'bg-transparent'
        }`}
      >
        <nav className="mx-auto max-w-6xl h-full px-5 sm:px-6 flex items-center justify-between">
          <Link href="/coming-soon" className="flex items-center gap-2">
            <LogoMark size={26} />
            <span
              className={`font-display text-lg font-semibold tracking-tighter transition-colors ${
                scrolled ? 'text-ink' : 'text-white'
              }`}
            >
              wroomly
            </span>
          </Link>

          <Link
            href={SUPPLIER_HREF}
            className={`inline-flex items-center h-9 px-4 rounded-full text-sm font-semibold transition-all active:scale-[0.97] ${
              scrolled
                ? 'bg-[oklch(0.22_0.075_256)] text-white hover:opacity-90'
                : 'bg-maize text-[oklch(0.22_0.075_256)] hover:shadow-[0_6px_22px_oklch(0.86_0.17_92/0.45)]'
            }`}
          >
            List your place
          </Link>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden min-h-dvh flex items-center justify-center">
        <AtmosphericBackground variant="hero" />

        <div className="relative z-10 w-full max-w-[34rem] px-6 py-24 text-center flex flex-col items-center">
          <motion.div {...rise(0.05)}>
            <span className="inline-flex items-center gap-2 rounded-full bg-maize px-3.5 py-1.5 text-[0.675rem] font-extrabold uppercase tracking-[0.08em] text-[oklch(0.22_0.075_256)] font-display">
              <span className="w-[5px] h-[5px] rounded-full bg-[oklch(0.22_0.075_256/0.4)]" />
              Coming soon to campus
            </span>
          </motion.div>

          <motion.h1
            {...rise(0.15)}
            className="font-display font-bold text-white text-balance mt-6 tracking-[-0.04em] leading-[1.0]"
            style={{ fontSize: 'clamp(2.5rem, 9.5vw, 3.75rem)' }}
          >
            The easiest way to sublease in Ann Arbor.
          </motion.h1>

          <motion.p
            {...rise(0.27)}
            className="text-white/60 text-pretty mt-5 max-w-[27rem] leading-[1.65]"
            style={{ fontSize: '1.0625rem' }}
          >
            A free marketplace built for University of Michigan students.
            Launching soon.
          </motion.p>

          <motion.div {...rise(0.4)} className="w-full mt-8">
            <WaitlistForm />
          </motion.div>
        </div>
      </section>

      {/* ── Supplier section ───────────────────────────────────────────── */}
      <section className="bg-maize-soft px-6 py-16 sm:py-20">
        <div className="relative isolate overflow-hidden mx-auto max-w-[30rem] rounded-[1.5rem] text-center px-8 pt-11 pb-9">
          <AtmosphericBackground base={NAVY} variant="panel" />

          <div className="relative z-10 flex flex-col items-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-maize/[0.12] border border-maize/[0.22] px-3 py-1 text-[0.675rem] font-extrabold uppercase tracking-[0.08em] text-maize font-display">
              <span className="w-[5px] h-[5px] rounded-full bg-maize" />
              Open now — be first
            </span>

            <h2
              className="font-display font-bold text-white text-balance mt-5 tracking-[-0.038em] leading-[1.05]"
              style={{ fontSize: 'clamp(1.5rem, 5vw, 1.875rem)' }}
            >
              List now and sit front row for launch.
            </h2>

            <p className="text-white/[0.54] mt-4 max-w-[22rem] mx-auto leading-[1.65] text-[0.9375rem]">
              Early suppliers get top placement when renters go live. Screenshot
              your existing post — our AI builds the listing in about a minute.
              Free, always.
            </p>

            <Link
              href={SUPPLIER_HREF}
              className="mt-7 inline-flex w-full max-w-[18rem] items-center justify-center gap-2 h-12 rounded-full bg-maize text-[oklch(0.22_0.075_256)] font-semibold text-[0.9375rem] shadow-[0_4px_18px_oklch(0.86_0.17_92/0.30)] hover:shadow-[0_10px_36px_oklch(0.86_0.17_92/0.45)] transition active:scale-[0.98]"
            >
              List it free now
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
            </Link>

            <p className="text-white/[0.26] text-xs mt-3.5">
              Takes about 60 seconds. Free, always.
            </p>
          </div>
        </div>
      </section>

      {/* ── Value props strip ──────────────────────────────────────────── */}
      <section className="bg-background border-t border-border px-6 py-9">
        <div className="flex flex-wrap items-center justify-center gap-3 text-[0.875rem] font-medium text-ink-soft">
          <span>Free to list</span>
          <span className="w-[3px] h-[3px] rounded-full bg-border" />
          <span>60-second listing</span>
          <span className="w-[3px] h-[3px] rounded-full bg-border" />
          <span>Fills faster</span>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="relative overflow-hidden bg-[oklch(0.22_0.075_256)] px-5 py-7">
        <div
          className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full blur-[90px] opacity-25"
          style={{ background: 'oklch(0.86 0.17 92 / 0.5)' }}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center gap-[1.125rem] text-center">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="font-display text-[0.9375rem] font-semibold tracking-tighter text-white">
              wroomly
            </span>
          </div>

          {/* Social row — Instagram + Email (X/Twitter removed per request) */}
          <div className="flex items-center gap-5">
            <a
              href="https://instagram.com/wroomly.app"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-white/[0.42] hover:text-white hover:-translate-y-px transition"
            >
              <InstagramIcon className="w-[18px] h-[18px]" />
            </a>
            <a
              href="mailto:delghu@umich.edu"
              aria-label="Email"
              className="text-white/[0.42] hover:text-white hover:-translate-y-px transition"
            >
              <Mail className="w-[18px] h-[18px]" />
            </a>
          </div>

          <p className="text-white/[0.36] text-xs">
            <a
              href="https://wroomly.app"
              className="hover:text-white/60 transition"
            >
              wroomly.app
            </a>{' '}
            · © {new Date().getFullYear()} Wroomly · Not affiliated with the
            University of Michigan.
          </p>
        </div>
      </footer>
    </div>
  )
}
