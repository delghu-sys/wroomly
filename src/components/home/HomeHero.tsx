'use client'

import { motion } from 'motion/react'
import { ShieldCheck, CheckCircle2, MessageSquare } from 'lucide-react'
import { Robot, Info } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'
import { TextScramble } from './TextScramble'
import { MagneticButton } from './MagneticButton'
import { BrandTooltip } from '@/components/brand/BrandTooltip'

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

const trustBadges = [
  { icon: ShieldCheck, label: '@umich.edu verified' },
  { icon: CheckCircle2, label: 'Reviewed listings' },
  { icon: MessageSquare, label: 'Private messaging' },
] as const

const spring = { type: 'spring' as const, stiffness: 80, damping: 20 }

export function HomeHero() {
  return (
    <section
      className="relative min-h-[100dvh] flex items-center overflow-hidden -mt-16 pt-16"
      style={{ background: 'oklch(0.22 0.075 256)' }}
    >
      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
        aria-hidden
      />

      {/* Mesh gradients */}
      <div
        className="absolute top-[-10%] left-[5%] w-[700px] h-[700px] rounded-full blur-[140px] opacity-30"
        style={{ background: 'oklch(0.22 0.06 265)' }}
        aria-hidden
      />
      <div
        className="absolute bottom-[5%] right-[10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-15"
        style={{ background: 'oklch(0.84 0.17 85 / 0.35)' }}
        aria-hidden
      />
      <div
        className="absolute top-[40%] right-[30%] w-[300px] h-[300px] rounded-full blur-[100px] opacity-10"
        style={{ background: 'oklch(0.50 0.10 280)' }}
        aria-hidden
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-center">
          {/* Left — content */}
          <div>
            {/* SEO: brand tagline kept as a kicker (not the heading) so the
                <h1> can lead with the real intent keyword "University of
                Michigan sublets". Single h1 per page; scramble animation
                preserved on both heading lines. */}
            <p className="font-display text-sm uppercase tracking-[0.22em] text-[oklch(0.84_0.17_85)] mb-4">
              Make room for connection.
            </p>
            <h1 className="font-display text-[clamp(2.6rem,6.4vw,5rem)] leading-[0.98] tracking-tight text-white">
              <TextScramble text="University of Michigan" />
              <br />
              <TextScramble
                text="sublets in Ann Arbor."
                delay={400}
                className="italic font-light text-[oklch(0.84_0.17_85)]"
              />
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.6 }}
              className="mt-7 text-lg sm:text-xl text-white/70 max-w-lg leading-relaxed"
            >
              Sublet or swap your Ann&nbsp;Arbor apartment with verified
              U&nbsp;of&nbsp;M students. Verified profiles, in-app messaging,
              and not a single Craigslist email.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.8 }}
              className="mt-9 flex flex-col sm:flex-row gap-3"
            >
              <Link href="/listings">
                <MagneticButton variant="primary" showArrow>
                  Browse listings
                </MagneticButton>
              </Link>
              <Link href="/list-place">
                <MagneticButton variant="secondary">
                  List your place
                </MagneticButton>
              </Link>
              <Link href="/import-listing">
                <MagneticButton variant="secondary">
                  Import your post
                </MagneticButton>
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.9 }}
              className="mt-4 text-sm text-white/55"
            >
              Can&rsquo;t find it yet?{' '}
              <Link
                href="/match"
                className="font-medium text-maize underline-offset-4 hover:underline"
              >
                Let our AI email you when it&rsquo;s posted →
              </Link>
            </motion.p>

            {/* Trust badges — live indicators */}
            <div className="mt-14 flex flex-wrap gap-3">
              {trustBadges.map(({ icon: Icon, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: 1.0 + i * 0.12 }}
                  className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.06]"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
                    <span className="rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  <Icon className="w-3.5 h-3.5 text-[oklch(0.84_0.17_85)]" />
                  <span className="text-sm text-white/70 font-medium">{label}</span>
                </motion.div>
              ))}

              {/* AI-moderated — tooltip-explained. Same chrome as the
                  pulsing badges, but the Info glyph + cursor signal that
                  hovering/focusing it reveals the explanation. */}
              <BrandTooltip
                side="top"
                content={
                  <>
                    Every listing is reviewed by AI before going live.
                    Borderline cases go to a human admin.
                  </>
                }
              >
                <motion.button
                  type="button"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: 1.0 + 3 * 0.12 }}
                  whileHover={{ y: -1 }}
                  className="
                    inline-flex items-center gap-2.5 px-4 py-2 rounded-full
                    bg-white/[0.04] backdrop-blur-sm border border-white/[0.06]
                    cursor-default
                    transition-[border-color,background-color] duration-300
                    hover:bg-white/[0.07] hover:border-[oklch(0.84_0.17_85/0.30)]
                    focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.30)]
                  "
                  aria-label="What does AI-moderated mean?"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
                    <span className="rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  <Robot
                    size={14}
                    weight="duotone"
                    className="text-[oklch(0.84_0.17_85)]"
                  />
                  <span className="text-sm text-white/70 font-medium">
                    AI-moderated
                  </span>
                  <Info
                    size={12}
                    weight="regular"
                    className="text-white/45 -ml-0.5"
                    aria-hidden
                  />
                </motion.button>
              </BrandTooltip>
            </div>
          </div>

          {/* Right — floating card composition */}
          <div className="hidden lg:block relative h-[520px]" aria-hidden>
            {/* Card 1 — back */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.5 }}
              className="absolute top-0 right-6"
            >
              <div className="rotate-6">
                <div className="animate-float w-52 h-64 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.07] shadow-[0_8px_32px_oklch(0_0_0/0.4)]">
                  <div className="h-28 rounded-t-2xl bg-gradient-to-br from-white/[0.06] to-transparent" />
                  <div className="p-4 space-y-3">
                    <div className="h-2.5 w-3/4 rounded-full bg-white/[0.08]" />
                    <div className="h-2 w-1/2 rounded-full bg-white/[0.05]" />
                    <div className="h-5 w-16 rounded-full bg-[oklch(0.84_0.17_85_/_0.15)] mt-4" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2 — middle, prominent */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.7 }}
              className="absolute top-20 right-28"
            >
              <div className="-rotate-3">
                <div className="animate-float-slow w-60 h-[300px] rounded-2xl bg-white/[0.06] backdrop-blur-lg border border-white/[0.10] shadow-[0_16px_48px_oklch(0_0_0/0.5)]">
                  <div className="h-36 rounded-t-2xl bg-gradient-to-br from-[oklch(0.84_0.17_85_/_0.08)] to-transparent" />
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-16 rounded-full bg-[oklch(0.84_0.17_85_/_0.2)] flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[oklch(0.84_0.17_85)]">
                          $850
                        </span>
                      </div>
                      <div className="h-4 w-12 rounded-full bg-white/[0.06] text-center text-[8px] text-white/20 leading-4">
                        /mo
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-white/[0.07]" />
                    <div className="h-2 w-2/3 rounded-full bg-white/[0.04]" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 3 — front bottom */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.9 }}
              className="absolute bottom-4 right-12"
            >
              <div className="rotate-2">
                <div
                  className="animate-float w-48 h-56 rounded-2xl bg-white/[0.03] backdrop-blur border border-white/[0.05] shadow-[0_8px_24px_oklch(0_0_0/0.3)]"
                  style={{ animationDelay: '3s' }}
                >
                  <div className="h-24 rounded-t-2xl bg-gradient-to-br from-white/[0.05] to-transparent" />
                  <div className="p-3.5 space-y-2.5">
                    <div className="h-2 w-2/3 rounded-full bg-white/[0.06]" />
                    <div className="h-2 w-1/2 rounded-full bg-white/[0.04]" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Decorative dots */}
            <div className="absolute top-44 right-2 w-2 h-2 rounded-full bg-[oklch(0.84_0.17_85)] animate-ping-soft" />
            <div
              className="absolute bottom-28 right-[340px] w-1.5 h-1.5 rounded-full bg-white/20 animate-float"
              style={{ animationDelay: '5s' }}
            />
            <div
              className="absolute top-8 right-[280px] w-1 h-1 rounded-full bg-[oklch(0.84_0.17_85_/_0.5)] animate-float-slow"
              style={{ animationDelay: '2s' }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
