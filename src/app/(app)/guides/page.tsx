import type { Metadata } from 'next'
import Link from 'next/link'
import { GUIDES } from '@/lib/seo/guides'
import { FAQS } from '@/lib/seo/faq'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { WordReveal } from '@/components/brand/WordReveal'
import { GuideBrowser } from '@/components/guides/GuideBrowser'
import { topicOf } from '@/lib/guides/present'
import { JsonLd, faqJsonLd, breadcrumbJsonLd } from '@/components/seo/JsonLd'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Guides: Subletting at the University of Michigan',
  description:
    'Student guides to subletting in Ann Arbor: how to sublet your UMich apartment, summer sublet tips, avoiding scams, and security deposits.',
  alternates: { canonical: '/guides' },
  openGraph: {
    title: 'Guides: Subletting at the University of Michigan | Wroomly',
    description:
      'Student guides to subletting in Ann Arbor: how-tos, summer tips, scam avoidance, and deposits.',
    images: ['/og-default.png'],
  },
}

export default function GuidesIndexPage() {
  // Newest first, so a returning reader sees what changed.
  const guides = [...GUIDES]
    .sort((a, b) => b.published.localeCompare(a.published) || b.updated.localeCompare(a.updated))
    .map(g => ({ slug: g.slug, title: g.title, excerpt: g.excerpt, readingMinutes: g.readingMinutes, topic: topicOf(g.slug) }))

  return (
    <div>
      <JsonLd
        data={[
          faqJsonLd(FAQS),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
          ]),
        ]}
      />

      <header className="relative isolate overflow-hidden -mt-16 pt-16">
        <AtmosphericBackground variant="hero" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-24">
          <Breadcrumbs tone="dark" crumbs={[{ name: 'Home', path: '/' }, { name: 'Guides' }]} />
          <p className="text-xs uppercase tracking-[0.22em] text-maize-bright font-medium mb-5">Guides</p>
          <h1 className="font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.97] tracking-tight text-white max-w-4xl">
            <WordReveal text="How subletting actually" delay={0.1} />
            <br />
            <WordReveal text="works here." delay={0.4} accentWords={['here.']} />
          </h1>
          <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-xl">
            Plain guides to subletting in Ann Arbor, written for Michigan students: leases, deposits, scams, roommates and timing.
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Live-data page: its own route (computes medians from active
            listings at request time), so it is not part of GUIDES. */}
        <Link
          href="/guides/ann-arbor-rent-prices"
          className="group block rounded-[2rem] bg-maize-bright p-7 sm:p-10 transition-transform duration-300 hover:-translate-y-0.5"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-navy-deep/70 font-bold">Live data</p>
          <h2 className="mt-3 font-display text-3xl sm:text-5xl tracking-tight text-navy-deep leading-[1.0] max-w-3xl text-balance">
            What Ann Arbor sublets actually cost <span className="italic font-light">right now.</span>
          </h2>
          <p className="mt-4 text-[16px] text-navy-deep/75 leading-relaxed max-w-xl">
            Median asking rents by bedroom count and neighborhood, worked out from the active listings on Wroomly, not last year&rsquo;s survey.
          </p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] text-navy-deep font-semibold group-hover:gap-2.5 transition-all">
            See the numbers <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
          </span>
        </Link>

        <div className="mt-14">
          <GuideBrowser guides={guides} />
        </div>

        {/* FAQ */}
        <section className="mt-20 pt-12 border-t border-line">
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-ink mb-8">
            Frequently asked <span className="italic font-light text-gold-deep">questions</span>
          </h2>
          <div className="divide-y divide-line border-y border-line max-w-3xl">
            {FAQS.map((f, i) => (
              <div key={i} className="py-6">
                <h3 className="font-display text-xl text-ink tracking-tight leading-snug">{f.question}</h3>
                <p className="mt-2 text-[16px] text-ink-soft leading-[1.7]">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
