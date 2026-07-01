'use client'

import { useRef, useSyncExternalStore } from 'react'

// No live ticking needed — we only want one snapshot taken right after
// mount, same as the original effect-based version.
const noSubscription = () => () => {}

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
  // getSnapshot must return a referentially-stable value between calls (or
  // React logs "getSnapshot should be cached" / re-renders in a loop) — cache
  // the one timestamp we ever want, computed lazily on first post-mount read.
  const cached = useRef<Date | null>(null)
  return useSyncExternalStore(
    noSubscription,
    () => (cached.current ??= new Date()),
    () => null,
  )
}
