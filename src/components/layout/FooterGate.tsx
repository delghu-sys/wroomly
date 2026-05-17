'use client'

import { usePathname } from 'next/navigation'
import { Footer } from './Footer'

/**
 * Hides the public footer on app-interior routes that have their own
 * full-height shell — currently the messaging surface. Keeps the public
 * footer everywhere else.
 */
export function FooterGate() {
  const pathname = usePathname()
  if (pathname?.startsWith('/messages')) return null
  return <Footer />
}
