'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { MessageCircle } from 'lucide-react'
import { MagneticButton } from '@/components/home/MagneticButton'

interface EmptyThreadStateProps {
  hasConversations: boolean
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

/**
 * Right-panel empty state shown on /messages when no thread is selected.
 *
 * Two variations:
 * - `hasConversations` true → "Pick up where you left off." (informational)
 * - `hasConversations` false → "No messages yet" + magnetic browse CTA
 */
export function EmptyThreadState({ hasConversations }: EmptyThreadStateProps) {
  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden">
      {/* Soft mesh */}
      <div
        className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full blur-[120px] opacity-25 pointer-events-none"
        style={{ background: 'oklch(0.84 0.17 85 / 0.30)' }}
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -left-32 w-[460px] h-[460px] rounded-full blur-[140px] opacity-15 pointer-events-none"
        style={{ background: 'oklch(0.45 0.10 280 / 0.30)' }}
        aria-hidden
      />

      <div className="relative text-center px-8 max-w-md">
        {/* Watermark icon */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={spring}
          className="relative inline-flex"
        >
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-[0_18px_50px_oklch(0.10_0.02_260/0.25)]"
            style={{
              background: 'oklch(0.10 0.02 260)',
              color: 'oklch(0.84 0.17 85)',
            }}
          >
            <MessageCircle className="w-11 h-11" strokeWidth={1.5} />
          </div>
          {/* Live pulse */}
          <span className="absolute -top-2 -right-2 flex h-3.5 w-3.5">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
            <span
              className="rounded-full h-3.5 w-3.5 bg-emerald-400 ring-2"
              style={{ '--tw-ring-color': 'oklch(0.10 0.02 260)' } as React.CSSProperties}
            />
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="mt-8 font-display text-[clamp(1.75rem,3vw,2.25rem)] tracking-tight text-ink leading-[1.05]"
        >
          {hasConversations ? (
            <>
              Pick up where you{' '}
              <span className="italic font-light text-[oklch(0.45_0.13_85)]">
                left off.
              </span>
            </>
          ) : (
            <>
              No messages yet —{' '}
              <span className="italic font-light text-[oklch(0.45_0.13_85)]">
                start one.
              </span>
            </>
          )}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.2 }}
          className="mt-4 text-ink-soft leading-relaxed max-w-[42ch] mx-auto"
        >
          {hasConversations
            ? 'Pick a conversation from the list — your most recent thread is on top.'
            : 'Browse listings and send an inquiry. Once a supplier replies, your chat will appear here.'}
        </motion.p>

        {!hasConversations && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.3 }}
            className="mt-8 inline-block"
          >
            <Link href="/listings">
              <MagneticButton variant="primary" showArrow>
                Browse listings
              </MagneticButton>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}
