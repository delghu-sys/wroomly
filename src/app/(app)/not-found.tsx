import type { Metadata } from 'next'
import { NotFoundContent } from '@/components/not-found/NotFoundContent'

export const metadata: Metadata = {
  title: '404: This room doesn’t exist',
  description:
    'The listing may have been removed, or the link might be off. Browse current Wroomly listings instead.',
  robots: { index: false, follow: false },
}

// In-app notFound() (e.g. a removed listing) renders inside the (app) layout,
// which already provides <main id="main-content"> — so no landmark here, or the
// document would have two main landmarks.
export default function NotFound() {
  return <NotFoundContent />
}
