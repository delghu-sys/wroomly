import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { GUIDES, getGuide } from '@/lib/seo/guides'
import { clampMeta } from '@/lib/seo/meta'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import {
  JsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
} from '@/components/seo/JsonLd'
import { ArrowRight, Check, Clock } from 'lucide-react'
import { AtmosphericBackground } from '@/components/brand/AtmosphericBackground'
import { GuideToc } from '@/components/guides/GuideToc'
import { GuideLiveStrip } from '@/components/guides/GuideLiveStrip'
import { formatUpdated, sectionIds, splitAccent, topicOf } from '@/lib/guides/present'

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
  // The full description is the on-page lede; the search-result snippet is
  // clamped so it is not cut off mid-sentence.
  const snippet = clampMeta(g.description)
  return {
    title: g.seoTitle ?? g.title,
    description: snippet,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: {
      title: `${g.seoTitle ?? g.title} | Wroomly`,
      description: snippet,
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

  // Same topic first, so "more guides" reads as a next step, not a random three.
  const topic = topicOf(g.slug)
  const others = [
    ...GUIDES.filter(o => o.slug !== g.slug && topicOf(o.slug) === topic),
    ...GUIDES.filter(o => o.slug !== g.slug && topicOf(o.slug) !== topic),
  ].slice(0, 3)
  const ids = sectionIds(g.sections.map(s => s.heading))
  const toc = g.sections.map((s, i) => ({ id: ids[i], label: s.heading }))
  const { lead, accent } = splitAccent(g.title)

  return (
    <div>
      <JsonLd
        data={[
          articleJsonLd({
            slug: g.slug,
            headline: g.title,
            description: g.description,
            datePublished: g.published,
            dateModified: g.updated,
          }),
          faqJsonLd(g.faqs),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
            { name: g.title, path: `/guides/${g.slug}` },
          ]),
        ]}
      />

      {/* Masthead */}
      <header className="relative isolate overflow-hidden -mt-16 pt-16">
        <AtmosphericBackground variant="hero" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-14 sm:pt-16 sm:pb-20">
          <Breadcrumbs
            tone="dark"
            crumbs={[{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }, { name: g.title }]}
          />
          <div className="grid lg:grid-cols-[minmax(0,1fr)_15rem] gap-10 lg:gap-16 items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-maize-bright font-medium mb-5">Guide · {topic}</p>
              <h1 className="font-display text-[clamp(2.15rem,5vw,4rem)] leading-[1.0] tracking-tight text-white max-w-4xl text-balance">
                {lead && <>{lead} </>}
                <span className="italic font-light text-maize-bright">{accent}</span>
              </h1>
              <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-2xl">{g.description}</p>
              <p className="mt-8 lg:hidden inline-flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/55">
                <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {g.readingMinutes} min read</span>
                <span>Updated {formatUpdated(g.updated)}</span>
              </p>
            </div>
            <dl className="hidden lg:block rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 space-y-5">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.2em] text-white/45">Reading time</dt>
                <dd className="mt-1 font-display text-3xl text-white tabular-nums">{g.readingMinutes} <span className="text-base text-white/60">min</span></dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.2em] text-white/45">Updated</dt>
                <dd className="mt-1 text-[15px] text-white/85">{formatUpdated(g.updated)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.2em] text-white/45">Written for</dt>
                <dd className="mt-1 text-[15px] text-white/85">Michigan students</dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid lg:grid-cols-[13.5rem_minmax(0,1fr)] gap-x-14 gap-y-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <GuideToc items={toc} />
          </div>
        </aside>

        <div className="min-w-0">
          {/* On a phone the contents sit above the article instead of beside it. */}
          <details className="lg:hidden mb-8 rounded-2xl border border-line bg-surface px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-semibold text-ink">In this guide</summary>
            <ol className="mt-3 space-y-2 text-[14px]">
              {toc.map(t => (
                <li key={t.id}><a href={`#${t.id}`} className="text-ink-soft hover:text-ink">{t.label}</a></li>
              ))}
            </ol>
          </details>

          <article className="max-w-[42rem]">
            <div className="space-y-12">
              {g.sections.map((s, i) => (
                <section key={i} id={ids[i]} className="scroll-mt-24">
                  <h2 className="font-display text-[1.7rem] sm:text-3xl tracking-tight text-ink leading-[1.1] text-balance mb-4">
                    {s.heading}
                  </h2>
                  <div className="space-y-4">
                    {s.paragraphs.map((p, j) => (
                      <p key={j} className="text-[17px] text-ink-soft leading-[1.75]">{p}</p>
                    ))}
                  </div>
                  {s.table && (
                    <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
                      <table className="w-full text-left text-[14.5px] border-collapse">
                        {s.table.caption && <caption className="sr-only">{s.table.caption}</caption>}
                        <thead>
                          <tr className="bg-navy-deep text-white">
                            {s.table.columns.map((c, ci) => (
                              <th key={ci} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {s.table.rows.map((row, ri) => (
                            <tr key={ri} className={`align-top ${ri % 2 ? 'bg-navy-soft/30' : 'bg-surface'}`}>
                              {row.map((cell, cj) => (
                                <td key={cj} className={`px-4 py-3 text-ink-soft leading-relaxed ${cj === 0 ? 'font-medium text-ink' : ''}`}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {s.bullets && (
                    <ul className="mt-6 space-y-3 rounded-2xl bg-maize-soft/60 border border-maize/30 px-5 py-5">
                      {s.bullets.map((b, k) => (
                        <li key={k} className="flex items-start gap-3 text-[16px] text-ink leading-relaxed">
                          <span className="mt-1 flex w-5 h-5 shrink-0 items-center justify-center rounded-full bg-navy-deep text-maize-bright">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            {g.links && g.links.length > 0 && (
              <section className="mt-12">
                <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted font-semibold mb-3">Explore</p>
                <div className="flex flex-wrap gap-2">
                  {g.links.map(l => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="inline-flex items-center px-4 h-9 rounded-full text-[13px] font-medium bg-surface border border-line text-ink-soft hover:border-navy/30 hover:text-ink transition"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* FAQ: mirrors the FAQPage JSON-LD above so the visible content
                matches the structured data (a Google requirement). */}
            <section className="mt-16 pt-10 border-t border-line">
              <h2 className="font-display text-[1.7rem] sm:text-3xl tracking-tight text-ink leading-[1.1] mb-6">
                Frequently asked <span className="italic font-light text-gold-deep">questions</span>
              </h2>
              <div className="divide-y divide-line border-y border-line">
                {g.faqs.map((f, i) => (
                  <div key={i} className="py-6">
                    <h3 className="font-display text-xl text-ink tracking-tight leading-snug">{f.question}</h3>
                    <p className="mt-2 text-[16px] text-ink-soft leading-[1.7]">{f.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          </article>
        </div>
      </div>

      <GuideLiveStrip />

      {/* Closing call to action */}
      <section className="relative isolate overflow-hidden py-16 sm:py-20">
        <AtmosphericBackground variant="panel" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-maize-bright font-medium mb-4">Wroomly</p>
            <h2 className="font-display text-3xl sm:text-5xl tracking-tight text-white leading-[1.0]">
              Make room for <span className="italic font-light text-maize-bright">your semester.</span>
            </h2>
            <p className="mt-4 text-white/70 text-[16px] leading-relaxed">
              Browse University of Michigan sublets in Ann Arbor, with a blue check on students who signed in with their @umich.edu account.
            </p>
          </div>
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 self-start sm:self-auto shrink-0 h-12 px-7 rounded-full bg-maize-bright text-navy-deep text-sm font-semibold hover:opacity-90 transition active:scale-[0.98]"
          >
            Browse sublets <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>
      </section>

      {/* More guides */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="flex items-end justify-between gap-6 mb-8">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink">
            Keep <span className="italic font-light text-gold-deep">reading</span>
          </h2>
          <Link href="/guides" className="text-sm font-semibold text-navy hover:underline underline-offset-4">All guides</Link>
        </div>
        <ul className="grid sm:grid-cols-3 gap-x-6 gap-y-8">
          {others.map(o => (
            <li key={o.slug}>
              <Link href={`/guides/${o.slug}`} className="group flex h-full flex-col border-t-2 border-navy-deep pt-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gold-deep font-semibold">{topicOf(o.slug)}</p>
                <p className="mt-2 font-display text-xl leading-snug tracking-tight text-ink group-hover:text-navy transition-colors text-balance">{o.title}</p>
                <p className="mt-auto pt-4 text-[12.5px] text-ink-muted">{o.readingMinutes} min read</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
