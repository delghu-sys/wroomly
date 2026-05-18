'use client'

import { useEffect, useState } from 'react'

/**
 * Returns `null` on the server and during the first client render, then
 * the current timestamp on every render after mount.
 *
 * Use this anywhere "now-relative" output (relative timestamps,
 * "Today"/"Yesterday" labels, expiry pills) needs to render. Branching
 * on `now === null` lets you produce identical SSR + first-client HTML —
 * no hydration warnings — then swap to live time once mounted.
 *
 *   const now = useNow()
 *   return <span>{now ? relative(then, now) : format(then, 'MMM d')}</span>
 */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
  }, [])
  return now
}
