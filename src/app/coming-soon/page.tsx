import type { Metadata } from 'next'
import { ComingSoonLanding } from '@/components/coming-soon/ComingSoonLanding'

export const metadata: Metadata = {
  title: 'Coming soon | Wroomly',
  description:
    'The easiest way to sublease in Ann Arbor — a free marketplace built for University of Michigan students. Launching soon. Join the waitlist.',
}

/**
 * Supply-only soft-launch landing. Shown to non-exempt visitors (renters) while
 * SUPPLY_ONLY_MODE is on. Suppliers/admins and bypass-cookie holders never see
 * this — the middleware lets them through to the full site.
 */
export default function ComingSoonPage() {
  return <ComingSoonLanding />
}
