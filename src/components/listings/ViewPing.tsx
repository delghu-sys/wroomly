'use client'

import { useEffect } from 'react'
import { track } from '@/lib/track'

/**
 * Fires one honest `listing_viewed` event per listing per browser session
 * (sessionStorage dedupe — reloads and back-navigation don't inflate the
 * count). The detail page aggregates these into the real view count shown
 * in ActivityCues; never fabricated, so it starts at zero and earns its way
 * up. Renders nothing.
 */
export function ViewPing({ listingId }: { listingId: string }) {
  useEffect(() => {
    try {
      const key = `wroomly_viewed_${listingId}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      /* private mode — still count the view, just without dedupe */
    }
    track('listing_viewed', { listingId })
  }, [listingId])
  return null
}
