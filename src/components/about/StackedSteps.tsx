'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import {
  Search,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  KeyRound,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react'

const STEPS: { icon: LucideIcon; n: string; title: string; body: string }[] = [
  {
    icon: Search,
    n: '01',
    title: 'Browse or list',
    body: 'Suppliers post a sublet in a few minutes. Consumers filter by neighborhood, dates, price, and amenities to find a place that fits.',
  },
  {
    icon: MessageSquare,
    n: '02',
    title: 'Message securely',
    body: 'Talk to the other side inside the app. No phone numbers traded, no email back-and-forth, no Craigslist surprises.',
  },
  {
    icon: ShieldCheck,
    n: '03',
    title: 'Apply with proof',
    body: 'Submit a quick application with your U-M info. Suppliers review and accept the candidate they want.',
  },
  {
    icon: CreditCard,
    n: '04',
    title: 'Pay & hold',
    body: 'Rent and deposit run through secure payments. Funds aren’t released until both sides confirm move-in is good.',
  },
  {
    icon: KeyRound,
    n: '05',
    title: 'Move in',
    body: 'Coordinate keys and check-in inside the platform. Disputes (rare) get a human review from our team.',
  },
  {
    icon: BadgeCheck,
    n: '06',
    title: 'Review',
    body: 'After move-in, both sides leave a public review. Reputation makes the next booking easier for everyone.',
  },
]

function Step({
  icon: Icon,
  n,
  title,
  body,
  index,
}: {
  icon: LucideIcon
  n: string
  title: string
  body: string
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-120px 0px' })
  const reverse = index % 2 === 1

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      className="relative"
    >
      <div
        className={`relative grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center ${
          reverse ? 'lg:[&>*:first-child]:order-2' : ''
        }`}
      >
        {/* Content side */}
        <div className="relative">
          {/* Giant watermark step number */}
          <span
            className="absolute -top-12 -left-2 sm:-top-16 sm:-left-6 font-display text-[clamp(6rem,14vw,11rem)] leading-none tracking-tighter text-[oklch(0.84_0.17_85/0.10)] select-none pointer-events-none"
            aria-hidden
          >
            {n}
          </span>

          <div className="relative">
            <div className="inline-flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] flex items-center justify-center shadow-[0_8px_24px_oklch(0.22_0.075_256/0.20)]">
                <Icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-ink-muted font-semibold">
                Step {n}
              </span>
            </div>
            <h3 className="font-display text-3xl sm:text-4xl tracking-tight text-ink leading-[1.05] mb-4">
              {title}
            </h3>
            <p className="text-ink-soft leading-relaxed max-w-[55ch]">{body}</p>
          </div>
        </div>

        {/* Visual side — abstract glass plate with the step number */}
        <div className="relative h-44 sm:h-56 hidden lg:block" aria-hidden>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, rotate: reverse ? 3 : -3 }}
            animate={
              inView
                ? { opacity: 1, scale: 1, rotate: reverse ? 2 : -2 }
                : undefined
            }
            transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="relative w-full h-full max-w-md">
              <div
                className="absolute inset-0 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_18px_50px_oklch(0_0_0/0.06)]"
                style={{ boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 18px 50px oklch(0 0 0 / 0.06)' }}
              />
              <div
                className="absolute -top-8 -right-8 w-44 h-44 rounded-full blur-3xl opacity-50"
                style={{ background: 'oklch(0.84 0.17 85 / 0.30)' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-[8rem] leading-none tracking-tighter text-[oklch(0.22_0.075_256)] italic font-light">
                  {n}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

export function StackedSteps() {
  return (
    <div className="space-y-20 sm:space-y-24">
      {STEPS.map((step, i) => (
        <Step key={step.n} {...step} index={i} />
      ))}
    </div>
  )
}
