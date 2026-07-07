import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { GUIDES, getGuide } from '@/lib/seo/guides'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import {
  JsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
} from '@/components/seo/JsonLd'
import { Clock, ArrowRight, Check } from 'lucide-react'

export function generateStaticParams() {
  return GUIDES.map(g => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const g = getGuide(slug)
  if (!g) return { title: 'Guide not found' }
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: {
      title: `${g.title} | Wroomly`,
      description: g.description,
      type: 'article',
      images: ['/og-default.png'],
    },
  }
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const g = getGuide(slug)
  if (!g) notFound()

  const others = GUIDES.filter(o => o.slug !== g.slug).slice(0, 3)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd
        data={[
          articleJsonLd({
            slug: g.slug,
            headline: g.title,
            description: g.description,
            datePublished: g.updated,
          }),
          faqJsonLd(g.faqs),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
            { name: g.title, path: `/guides/${g.slug}` },
          ]),
        ]}
      />

      <Breadcrumbs
        crumbs={[
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: g.title },
        ]}
      />

      <article>
        <header className="mb-8">
          <h1 className="font-display text-4xl sm:text-[2.75rem] tracking-tight text-ink leading-[1.08] text-balance">
            {g.title}
          </h1>
          <p className="mt-3 text-lg text-ink-muted leading-relaxed">{g.description}</p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-ink-muted">
            <Clock className="w-3.5 h-3.5" /> {g.readingMinutes} min read · Updated{' '}
            {new Date(g.updated).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </header>

        <div className="space-y-9">
          {g.sections.map((s, i) => (
            <section key={i}>
              <h2 className="font-display text-2xl tracking-tight text-ink mb-3">
                {s.heading}
              </h2>
              <div className="space-y-3">
                {s.paragraphs.map((p, j) => (
                  <p key={j} className="text-[15.5px] text-ink-soft leading-[1.7]">
                    {p}
                  </p>
                ))}
              </div>
              {s.bullets && (
                <ul className="mt-4 space-y-2">
                  {s.bullets.map((b, k) => (
                    <li
                      key={k}
                      className="flex items-start gap-2 text-[15px] text-ink-soft leading-relaxed"
                    >
                      <Check
                        className="w-4 h-4 text-[oklch(0.45_0.13_85)] shrink-0 mt-1"
                        strokeWidth={2.5}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {g.links && g.links.length > 0 && (
          <section className="mt-10">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold mb-3">
              Explore
            </p>
            <div className="flex flex-wrap gap-2">
              {g.links.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex items-center px-3.5 h-9 rounded-full text-[13px] font-medium bg-white/85 border border-line text-ink-soft hover:border-[oklch(0.84_0.17_85/0.45)] hover:text-ink transition"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ — mirrors the FAQPage JSON-LD above so the visible content
            matches the structured data (a Google requirement). */}
        <section className="mt-12 pt-8 border-t border-line">
          <h2 className="font-display text-2xl tracking-tight text-ink mb-6">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {g.faqs.map((f, i) => (
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
      </article>

      {/* CTA */}
      <div className="mt-12 rounded-3xl border border-line bg-surface p-7 text-center">
        <h2 className="font-display text-2xl tracking-tight text-ink">
          Ready to find your sublet?
        </h2>
        <p className="mt-2 text-ink-muted text-[15px]">
          Browse verified University of Michigan sublets in Ann Arbor.
        </p>
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 mt-5 h-11 px-6 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] text-sm font-semibold hover:bg-[oklch(0.22_0.075_256)]/90 transition active:scale-[0.98]"
        >
          Browse listings <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Related guides */}
      <section className="mt-12 pt-8 border-t border-line">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted font-semibold mb-4">
          More guides
        </p>
        <div className="space-y-3">
          {others.map(o => (
            <Link
              key={o.slug}
              href={`/guides/${o.slug}`}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 hover:border-[oklch(0.84_0.17_85/0.45)] transition"
            >
              <span className="font-medium text-ink text-[15px] group-hover:text-navy transition-colors">
                {o.title}
              </span>
              <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
