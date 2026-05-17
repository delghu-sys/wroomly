'use client'

import { motion } from 'motion/react'

interface WordRevealProps {
  text: string
  /** Render each word in this class — supports italic accent words */
  className?: string
  /** Stagger between words (default 0.07s) */
  stagger?: number
  /** Initial delay before sequence starts (default 0) */
  delay?: number
  /** Optional words to render italic + accent color (matched case-insensitively) */
  accentWords?: string[]
}

/**
 * Staggered word-by-word reveal with spring physics.
 *
 * Mirrors the homepage hero animation style — words rise and fade in
 * with a per-word delay. Use `accentWords` to mark words that should
 * render in italic light-weight maize, matching the brand pattern.
 *
 * Wrap inside the desired heading element from the parent (h1/h2/etc).
 */
export function WordReveal({
  text,
  className,
  stagger = 0.07,
  delay = 0,
  accentWords = [],
}: WordRevealProps) {
  const accentSet = new Set(accentWords.map(w => w.toLowerCase().replace(/[.,!?]/g, '')))
  const words = text.split(' ')

  return (
    <span className={className}>
      {words.map((word, i) => {
        const clean = word.toLowerCase().replace(/[.,!?]/g, '')
        const isAccent = accentSet.has(clean)
        return (
          <motion.span
            key={`${word}-${i}`}
            initial={{ opacity: 0, y: '0.6em' }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
              delay: delay + i * stagger,
            }}
            className={`inline-block ${isAccent ? 'italic font-light text-[oklch(0.84_0.17_85)]' : ''}`}
            style={{ marginRight: i < words.length - 1 ? '0.25em' : 0 }}
          >
            {word}
          </motion.span>
        )
      })}
    </span>
  )
}
