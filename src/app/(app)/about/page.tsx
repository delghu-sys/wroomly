import Link from 'next/link'
import type { Metadata } from 'next'
import { ShieldCheck, CreditCard, MessageSquare } from 'lucide-react'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { WordReveal } from '@/components/brand/WordReveal'
import { LiveBadge } from '@/components/brand/LiveBadge'
import { MagneticButton } from '@/components/home/MagneticButton'
import { ScrollReveal } from '@/components/home/ScrollReveal'
import { StackedSteps } from '@/components/about/StackedSteps'
import { TrustBento } from '@/components/about/TrustBento'

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'See how Wroomly handles verification, secure payments, and in-app messaging for U of M student housing.',
  openGraph: {
    title: 'How It Works | Wroomly',
    description:
      'See how Wroomly handles verification, secure payments, and in-app messaging for U of M student housing.',
    images: ['/og-default.png'],
  },
}

export default function AboutPage() {
  return (
    <div>
      {/* ── Atmospheric Hero ── */}
      <section className="relative isolate overflow-hidden -mt-16 pt-16 min-h-[80vh] flex items-center">
        <AtmosphericBackground variant="hero" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[oklch(0.84_0.17_85)] font-medium mb-5">
                How it works
              </p>

              <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-tight text-white">
                <WordReveal text="Make room for" delay={0.1} />
                <br />
                <WordReveal text="connection." delay={0.4} accentWords={['connection.']} />
              </h1>

              <p className="mt-7 text-lg text-white/70 leading-relaxed max-w-xl">
                Wroomly is a verified marketplace for sublets and apartment swaps between
                University of Michigan students. Every listing is reviewed, every payment is
                secured, and every conversation stays on-platform.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <LiveBadge
                  icon={<ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  delay={0.7}
                >
                  @umich.edu verified
                </LiveBadge>
                <LiveBadge
                  icon={<CreditCard className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  delay={0.82}
                >
                  Escrowed payments
                </LiveBadge>
                <LiveBadge
                  icon={<MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  delay={0.94}
                >
                  Private messaging
                </LiveBadge>
              </div>
            </div>

            {/* Right — abstract glass composition */}
            <div className="hidden lg:block relative h-[440px]" aria-hidden>
              <div
                className="absolute top-8 right-12 w-56 h-72 rounded-3xl bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] shadow-[0_18px_50px_oklch(0_0_0/0.40)] rotate-[5deg]"
              >
                <div className="animate-float p-5 flex flex-col gap-4 h-full">
                  <div className="h-2.5 w-3/4 rounded-full bg-white/[0.10]" />
                  <div className="h-2 w-1/2 rounded-full bg-white/[0.06]" />
                  <div className="mt-auto space-y-2">
                    <div className="h-10 rounded-xl bg-[oklch(0.84_0.17_85/0.15)] border border-[oklch(0.84_0.17_85/0.20)]" />
                    <div className="h-10 rounded-xl bg-white/[0.05] border border-white/[0.06]" />
                  </div>
                </div>
              </div>

              <div
                className="absolute top-24 right-48 w-60 h-80 rounded-3xl bg-white/[0.07] backdrop-blur-xl border border-white/[0.10] shadow-[0_18px_50px_oklch(0_0_0/0.50)] -rotate-[4deg]"
              >
                <div className="animate-float-slow p-5 flex flex-col gap-3 h-full">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[oklch(0.84_0.17_85/0.25)] flex items-center justify-center">
                      <ShieldCheck
                        className="w-3.5 h-3.5 text-[oklch(0.84_0.17_85)]"
                        strokeWidth={2}
                      />
                    </span>
                    <div className="h-2 w-20 rounded-full bg-white/[0.10]" />
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-white/[0.08]" />
                  <div className="h-2 w-2/3 rounded-full bg-white/[0.05]" />
                  <div className="mt-auto h-px bg-white/[0.06]" />
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
                      <span className="rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    <span className="text-[10px] text-white/70 tracking-wide">
                      Verified · Live
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="absolute top-4 right-2 w-1.5 h-1.5 rounded-full bg-[oklch(0.84_0.17_85)]"
              />
              <div
                className="absolute bottom-6 right-[300px] w-1 h-1 rounded-full bg-white/30 animate-float"
                style={{ animationDelay: '4s' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── The flow — stacked steps ── */}
      <section className="relative py-24 sm:py-32" style={{ background: 'oklch(0.97 0.008 75)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.22em] text-ink-muted font-semibold mb-4">
              The flow
            </p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-ink max-w-3xl leading-[0.95]">
              Six steps from{' '}
              <span className="italic font-light text-[oklch(0.45_0.13_85)]">
                hello to keys in hand.
              </span>
            </h2>
          </ScrollReveal>

          <div className="mt-20">
            <StackedSteps />
          </div>
        </div>
      </section>

      {/* ── Trust & safety bento ── */}
      <section id="trust" className="relative py-24 sm:py-28 bg-background scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.22em] text-ink-muted font-semibold mb-4">
                Trust &amp; safety
              </p>
              <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[0.95]">
                Built for students,{' '}
                <span className="italic font-light text-[oklch(0.45_0.13_85)]">
                  not strangers.
                </span>
              </h2>
              <p className="mt-5 text-ink-soft leading-relaxed max-w-[55ch]">
                We&rsquo;re a small platform on purpose — verified accounts, reviewed
                listings, and payments that never go off-platform.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-14">
            <TrustBento />
          </div>
        </div>
      </section>

      {/* ── CTA — atmospheric, dual button ── */}
      <section className="relative isolate overflow-hidden py-32 sm:py-40">
        <AtmosphericBackground variant="panel" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <p className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-[oklch(0.84_0.17_85)] font-medium mb-6">
              <span className="w-8 h-px bg-[oklch(0.84_0.17_85_/_0.40)]" aria-hidden />
              Ready when you are
              <span className="w-8 h-px bg-[oklch(0.84_0.17_85_/_0.40)]" aria-hidden />
            </p>
            <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl tracking-tight text-white leading-[0.95]">
              Find your next place.
              <br />
              <span className="italic font-light text-[oklch(0.84_0.17_85)]">
                Or list your own.
              </span>
            </h2>
            <p className="mt-7 text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
              A few clicks to browse what&rsquo;s open, or a few minutes to put yours up.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/listings">
                <MagneticButton variant="primary" showArrow>
                  Browse listings
                </MagneticButton>
              </Link>
              <Link href="/list-place">
                <MagneticButton variant="secondary">List your place</MagneticButton>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
