import type { Metadata } from 'next'
import Link from 'next/link'
import { GUIDES } from '@/lib/seo/guides'
import { FAQS } from '@/lib/seo/faq'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd, faqJsonLd, breadcrumbJsonLd } from '@/components/seo/JsonLd'
import { BookOpen, ArrowRight, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Guides — Subletting at the University of Michigan',
  description:
    'Student guides to subletting in Ann Arbor: how to sublet your UMich apartment, summer sublet tips, avoiding scams, and security deposits.',
  alternates: { canonical: '/guides' },
  openGraph: {
    title: 'Guides — Subletting at the University of Michigan | Wroomly',
    description:
      'Student guides to subletting in Ann Arbor — how-tos, summer tips, scam avoidance, and deposits.',
    images: ['/og-default.png'],
  },
}

export default function GuidesIndexPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd
        data={[
          faqJsonLd(FAQS),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
          ]),
        ]}
      />

      <Breadcrumbs crumbs={[{ name: 'Home', path: '/' }, { name: 'Guides' }]} />

      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[oklch(0.45_0.13_85)] font-bold mb-3">
          <BookOpen className="w-3.5 h-3.5" /> Resources
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[1.05] text-balance">
          Subletting at Michigan,{' '}
          <span className="italic font-light text-navy">explained.</span>
        </h1>
        <p className="mt-4 text-lg text-ink-muted leading-relaxed">
          Straight-talking guides to subletting housing in Ann
          Arbor — written for U of M students, by people who get the drill.
        </p>
      </header>

      {/* Live-data page — its own route (computes medians from active
          listings at request time), so it's not part of GUIDES. */}
      <Link
        href="/guides/ann-arbor-rent-prices"
        className="group mt-10 block rounded-3xl border border-line bg-[oklch(0.22_0.075_256)] p-6 sm:p-7 hover:-translate-y-0.5 transition-all duration-300"
      >
        <p className="text-[10px] uppercase tracking-[0.22em] text-[oklch(0.84_0.17_85)] font-bold">
          Live data
        </p>
        <h2 className="mt-2 font-display text-2xl tracking-tight text-white leading-snug">
          What Ann Arbor sublets actually cost right now
        </h2>
        <p className="mt-2 text-[14px] text-white/70 leading-relaxed max-w-xl">
          Median asking rents by bedroom count and neighborhood — computed from
          the active verified listings on Wroomly, not last year&rsquo;s survey.
        </p>
        <span className="mt-4 inline-flex items-center gap-1 text-[13px] text-[oklch(0.84_0.17_85)] font-medium group-hover:gap-2 transition-all">
          See the numbers <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </Link>

      {/* Guide cards */}
      <div className="mt-6 grid sm:grid-cols-2 gap-5">
        {GUIDES.map(g => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="group rounded-3xl border border-line bg-surface p-6 hover:border-[oklch(0.84_0.17_85/0.45)] hover:-translate-y-0.5 transition-all duration-300"
          >
            <h2 className="font-display text-xl tracking-tight text-ink leading-snug group-hover:text-navy transition-colors">
              {g.title}
            </h2>
            <p className="mt-2 text-[14px] text-ink-soft leading-relaxed">{g.excerpt}</p>
            <div className="mt-4 flex items-center justify-between text-[12px] text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {g.readingMinutes} min read
              </span>
              <span className="inline-flex items-center gap-1 text-navy font-medium group-hover:gap-2 transition-all">
                Read <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* FAQ */}
      <section className="mt-16 pt-10 border-t border-line">
        <h2 className="font-display text-3xl tracking-tight text-ink mb-8">
          Frequently asked questions
        </h2>
        <div className="space-y-6 max-w-3xl">
          {FAQS.map((f, i) => (
            <div key={i}>
              <h3 className="font-display text-lg text-ink tracking-tight">
                {f.question}
              </h3>
              <p className="mt-1.5 text-[15px] text-ink-soft leading-relaxed">
                {f.answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
