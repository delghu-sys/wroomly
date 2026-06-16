import type { Metadata } from 'next'
import { ImportListingForm } from '@/components/import/ImportListingForm'
import { Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'List your place with photos',
  description:
    'Upload photos of your room or apartment — and screenshots of your existing post if you have one. Wroomly turns them into a draft listing you can review and publish.',
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
          Upload your photos.{' '}
          <span className="italic font-light text-navy">We’ll draft the listing.</span>
        </h1>
        <p className="mt-4 text-lg text-ink-muted leading-relaxed">
          Add photos of your room or apartment — and screenshots of your existing post
          if you have one. Wroomly turns them into a draft you can review and publish.
          A written description is optional.
        </p>
      </header>

      <ImportListingForm />
    </div>
  )
}
