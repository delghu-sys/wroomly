'use client'

import { useState, useEffect } from 'react'
import { useReducedMotion } from 'motion/react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

interface TextScrambleProps {
  text: string
  className?: string
  delay?: number
  speed?: number
}

/**
 * Character-by-character scramble reveal. Honors `prefers-reduced-motion`
 * by rendering the final text immediately — no glyph thrash for users
 * who asked the OS to keep things still.
 */
export function TextScramble({
  text,
  className = '',
  delay = 0,
  speed = 35,
}: TextScrambleProps) {
  const prefersReducedMotion = useReducedMotion()
  // When reduced motion is requested we render the final text right away
  // on the very first render — same on server and client, no scramble.
  const [output, setOutput] = useState<string>(
    prefersReducedMotion ? text : ''
  )

  useEffect(() => {
    if (prefersReducedMotion) {
      setOutput(text)
      return
    }

    let iteration = 0
    let interval: ReturnType<typeof setInterval>

    const timer = setTimeout(() => {
      interval = setInterval(() => {
        setOutput(
          text
            .split('')
            .map((char, i) => {
              if (char === ' ') return ' '
              if (i < iteration) return char
              return CHARS[Math.floor(Math.random() * CHARS.length)]
            })
            .join('')
        )
        iteration += 1 / 3
        if (iteration >= text.length) {
          clearInterval(interval)
          setOutput(text)
        }
      }, speed)
    }, delay)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [text, delay, speed, prefersReducedMotion])

  return <span className={className}>{output || ' '}</span>
}
