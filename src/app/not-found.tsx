import type { Metadata } from 'next'
import { NotFoundContent } from '@/components/not-found/NotFoundContent'

export const metadata: Metadata = {
  title: '404 — This room doesn’t exist',
  description:
    'The listing may have been removed, or the link might be off. Browse current Wroomly listings instead.',
  robots: { index: false, follow: false },
}

// Global unmatched URLs render this at the root (no (app) layout, so no <main>
// above it) — supply the main landmark here.
export default function GlobalNotFound() {
  return (
    <main id="main-content">
      <NotFoundContent />
    </main>
  )
}
