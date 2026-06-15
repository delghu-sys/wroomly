import type { Metadata } from 'next'
import { ImportListingForm } from '@/components/import/ImportListingForm'
import { Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Import your sublet post',
  description:
    'Already posted your sublet on Facebook, GroupMe, Reddit, or Craigslist? Paste it or upload screenshots — Wroomly turns it into a draft listing you can review and publish.',
  alternates: { canonical: '/import-listing' },
}

export default function ImportListingPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <header className="mb-8">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[oklch(0.45_0.13_85)] font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5" /> AI Listing Importer
        </p>
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink leading-[1.05] text-balance">
          Already posted your sublet{' '}
          <span className="italic font-light text-navy">somewhere else?</span>
        </h1>
        <p className="mt-4 text-lg text-ink-muted leading-relaxed">
          Paste your post or upload screenshots. Wroomly will turn it into a draft
          listing you can review and publish.
        </p>
      </header>

      <ImportListingForm />
    </div>
  )
}
