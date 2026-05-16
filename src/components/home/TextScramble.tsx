'use client'

import { useState, useEffect } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

interface TextScrambleProps {
  text: string
  className?: string
  delay?: number
  speed?: number
}

export function TextScramble({ text, className = '', delay = 0, speed = 35 }: TextScrambleProps) {
  const [output, setOutput] = useState('')

  useEffect(() => {
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
  }, [text, delay, speed])

  return <span className={className}>{output || '\u00A0'}</span>
}
