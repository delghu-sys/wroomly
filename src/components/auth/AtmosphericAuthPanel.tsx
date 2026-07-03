'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { ShieldCheck, ChatCircleDots, Tag } from '@phosphor-icons/react/dist/ssr'
import { LogoMark } from '@/components/brand/Logo'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { WordReveal } from '@/components/brand/WordReveal'
import { LiveBadge } from '@/components/brand/LiveBadge'
import { RotatingTestimonial, type Testimonial } from './RotatingTestimonial'

interface AtmosphericAuthPanelProps {
  /** First line of the headline */
  headline1: string
  /** Second line — usually italic accent */
  headline2: string
  /** Words within headline2 to render italic + accent */
  accentWords?: string[]
  /** Subhead body copy */
  subhead: string
  /** Optional rotating testimonial list. */
  testimonials?: Testimonial[]
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

const TRUST_ITEMS = [
  { Icon: ShieldCheck, text: 'Verified email accounts' },
  { Icon: ChatCircleDots, text: 'Private in-app messaging' },
  { Icon: Tag, text: 'Free to list & browse' },
] as const

/**
 * The reusable left-side atmospheric panel for /sign-in and /sign-up.
 * Mesh + noise + brand copy + live trust badges + optional rotating
 * testimonial — matching the homepage hero atmosphere.
 */
export function AtmosphericAuthPanel({
  headline1,
  headline2,
  accentWords,
  subhead,
  testimonials,
}: AtmosphericAuthPanelProps) {
  return (
    <div className="relative lg:w-[48%] xl:w-[45%] overflow-hidden flex flex-col justify-between p-8 sm:p-12 lg:p-16 min-h-[40vh] lg:min-h-[100dvh] isolate">
      <AtmosphericBackground variant="auth" />

      {/* Top — logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="relative z-10"
      >
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <LogoMark size={32} />
          <span className="font-display text-lg font-semibold tracking-tighter text-white">
            wroomly
          </span>
        </Link>
      </motion.div>

      {/* Middle — headline + trust badges + testimonial */}
      <div className="relative z-10 my-auto py-12 lg:py-0 space-y-9">
        <div>
          <h1 className="font-display text-[clamp(2.4rem,5vw,3.75rem)] tracking-tight leading-[1.02] text-white">
            <WordReveal text={headline1} delay={0.1} />
            <br />
            <WordReveal text={headline2} delay={0.35} accentWords={accentWords} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.6 }}
            className="mt-6 text-white/70 text-lg leading-relaxed max-w-md"
          >
            {subhead}
          </motion.p>
        </div>

        {/* Live trust badges */}
        <div className="flex flex-wrap gap-3 max-w-md">
          {TRUST_ITEMS.map(({ Icon, text }, i) => (
            <LiveBadge
              key={text}
              icon={<Icon size={14} weight="duotone" />}
              delay={0.8 + i * 0.1}
            >
              {text}
            </LiveBadge>
          ))}
        </div>

        {/* Rotating testimonial */}
        {testimonials && testimonials.length > 0 && (
          <RotatingTestimonial testimonials={testimonials} />
        )}
      </div>

      {/* Bottom — fine print */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...spring, delay: 1.3 }}
        className="relative z-10 hidden lg:block text-xs text-white/35"
      >
        © {new Date().getFullYear()} Wroomly. Not affiliated with the University of Michigan.
      </motion.p>
    </div>
  )
}
