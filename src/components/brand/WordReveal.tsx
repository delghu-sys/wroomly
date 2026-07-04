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
 * Staggered word-by-word reveal — pure CSS, no client JS.
 *
 * This intentionally does NOT use motion/react: hero headlines are the
 * page's LCP element, and a motion entrance server-renders as opacity:0,
 * leaving the hero INVISIBLE until the whole bundle hydrates — ~7s on a
 * throttled phone (Lighthouse mobile, 2026-07 perf pass 2). CSS animations
 * start the moment styles parse, so the reveal plays at ~FCP instead.
 * Reduced-motion users get static text via the global reduced-motion rules
 * (animation:none leaves the element at its natural, visible state).
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
          <span
            key={`${word}-${i}`}
            className={`inline-block animate-word-rise ${isAccent ? 'italic font-light text-[oklch(0.84_0.17_85)]' : ''}`}
            style={{
              animationDelay: `${delay + i * stagger}s`,
              marginRight: i < words.length - 1 ? '0.25em' : 0,
            }}
          >
            {word}
          </span>
        )
      })}
    </span>
  )
}
