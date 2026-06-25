'use client'

import { usePathname } from 'next/navigation'
import { Footer } from './Footer'

/**
 * Hides the public footer on app-interior routes that have their own
 * full-height shell — currently the messaging surface. Keeps the public
 * footer everywhere else.
 *
 * During the supply-only soft launch it's also hidden for non-exempt viewers
 * (renters/anon): the footer is wall-to-wall renter links that only lead to
 * /coming-soon, so it reads as broken on the supplier import/listing flow.
 */
export function FooterGate({
  supplyOnly = false,
  userType = null,
}: {
  supplyOnly?: boolean
  userType?: string | null
}) {
  const pathname = usePathname()
  if (pathname?.startsWith('/messages')) return null
  const exempt = userType === 'supplier' || userType === 'admin'
  if (supplyOnly && !exempt) return null
  return <Footer />
}
