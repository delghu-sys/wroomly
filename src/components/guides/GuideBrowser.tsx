'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { TOPICS, type GuideTopic } from '@/lib/guides/present'

export interface GuideCardData {
  slug: string
  title: string
  excerpt: string
  readingMinutes: number
  topic: GuideTopic
}

/** The guide list with topic chips. Every card is rendered on the server and
 *  stays in the page; the chips only hide the ones you did not ask for. */
export function GuideBrowser({ guides }: { guides: GuideCardData[] }) {
  const [topic, setTopic] = useState<GuideTopic | 'All'>('All')
  const present = TOPICS.filter(t => guides.some(g => g.topic === t))
  const chip = (active: boolean) =>
    `h-9 px-4 rounded-full text-[13px] font-medium border transition-colors ${
      active ? 'bg-navy-deep text-white border-navy-deep' : 'bg-surface text-ink-soft border-line hover:border-navy/30'
    }`
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter guides by topic">
        <button type="button" className={chip(topic === 'All')} aria-pressed={topic === 'All'} onClick={() => setTopic('All')}>
          All {guides.length}
        </button>
        {present.map(t => (
          <button key={t} type="button" className={chip(topic === t)} aria-pressed={topic === t} onClick={() => setTopic(t)}>
            {t}
          </button>
        ))}
      </div>
      <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
        {guides.map(g => (
          <li key={g.slug} hidden={topic !== 'All' && g.topic !== topic}>
            <Link href={`/guides/${g.slug}`} className="group flex h-full flex-col border-t-2 border-navy-deep pt-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-gold-deep font-semibold">{g.topic}</p>
              <h2 className="mt-3 font-display text-[1.45rem] leading-[1.12] tracking-tight text-ink text-balance group-hover:text-navy transition-colors">{g.title}</h2>
              <p className="mt-3 text-[14.5px] text-ink-soft leading-relaxed line-clamp-3">{g.excerpt}</p>
              <p className="mt-auto pt-5 flex items-center justify-between text-[12.5px] text-ink-muted">
                <span>{g.readingMinutes} min read</span>
                <span className="inline-flex items-center gap-1 text-navy font-semibold group-hover:gap-1.5 transition-all">
                  Read <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.25} />
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
