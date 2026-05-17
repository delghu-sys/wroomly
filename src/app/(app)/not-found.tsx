import type { Metadata } from 'next'
import { House, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { WordReveal } from '@/components/brand/WordReveal'
import { MagneticLinkCta } from '@/components/brand/MagneticLinkCta'
import { FloatingDoor } from '@/components/not-found/FloatingDoor'

export const metadata: Metadata = {
  title: '404 — This room doesn’t exist',
  description:
    'The listing may have been removed, or the link might be off. Browse current Wroomly listings instead.',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <section className="relative isolate overflow-hidden min-h-[calc(100dvh-4rem)] flex items-center">
      <AtmosphericBackground variant="hero" />

      {/* Giant background "404" watermark — display font, low opacity */}
      <p
        aria-hidden
        className="
          pointer-events-none absolute inset-0
          flex items-center justify-center
          font-display italic font-light
          tracking-tighter leading-none select-none
        "
        style={{
          fontSize: 'clamp(18rem, 38vw, 36rem)',
          color: 'oklch(0.84 0.17 85 / 0.06)',
          letterSpacing: '-0.05em',
        }}
      >
        404
      </p>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          {/* ── Left — copy + CTAs ── */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[oklch(0.84_0.17_85)] font-semibold mb-5">
              Error 404
            </p>

            <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-tight text-white">
              <WordReveal text="This room" delay={0.1} />
              <br />
              <WordReveal
                text="doesn’t exist."
                delay={0.4}
                accentWords={['doesn’t', 'exist.']}
              />
            </h1>

            <p className="mt-7 text-lg text-white/70 leading-relaxed max-w-lg">
              The listing may have been removed, or the link might be off.
              Try browsing what&rsquo;s open right now — new places land every day.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 max-w-md">
              <MagneticLinkCta
                href="/listings"
                variant="primary"
                icon={<MagnifyingGlass size={16} weight="bold" />}
              >
                Browse listings
              </MagneticLinkCta>
              <MagneticLinkCta
                href="/"
                variant="ghost"
                tone="dark"
                size="sm"
                icon={<House size={15} weight="duotone" />}
              >
                Go home
              </MagneticLinkCta>
            </div>

            <p className="mt-10 text-[12.5px] text-white/55 max-w-md leading-relaxed">
              If you got here from a Wroomly email or message, the listing was
              likely taken down by its owner or rented to someone else.
            </p>
          </div>

          {/* ── Right — floating door composition ── */}
          <div
            className="hidden lg:block relative h-[460px]"
            aria-hidden
          >
            <FloatingDoor />
          </div>
        </div>
      </div>
    </section>
  )
}
