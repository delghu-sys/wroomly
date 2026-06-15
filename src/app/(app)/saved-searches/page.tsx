import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Bookmark, ArrowRight } from 'lucide-react'
import { SavedSearchRow } from '@/components/listings/SavedSearchRow'

export const metadata: Metadata = {
  title: 'Saved searches',
  description: 'Filter combos you saved on Wroomly — and the email alerts for them.',
}

export default async function SavedSearchesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?next=/saved-searches')

  const { data: searches } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const rows = searches ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="animate-fade-up mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
          {rows.length} {rows.length === 1 ? 'saved search' : 'saved searches'}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
          Saved <span className="italic font-light text-navy">searches.</span>
        </h1>
        <p className="text-ink-muted mt-3 leading-relaxed max-w-xl">
          We&rsquo;ll email you when new listings match. Toggle alerts off any
          time, or delete a search you&rsquo;re done with.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="animate-fade-up delay-100 text-center py-20 rounded-3xl border border-dashed border-line bg-surface/60">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-navy-soft text-navy items-center justify-center mb-4">
            <Bookmark className="w-6 h-6" />
          </div>
          <p className="font-display text-2xl text-ink">No saved searches yet</p>
          <p className="text-sm text-ink-muted mt-2 mb-6 max-w-sm mx-auto">
            Pick a few filters on Browse, then hit <strong>Save search</strong> to
            stash the combo and get alerts.
          </p>
          <Link
            href="/listings"
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] text-sm font-semibold tracking-tight hover:bg-[oklch(0.22_0.075_256)]/90 transition active:scale-[0.98]"
          >
            Browse listings <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="stagger-reveal space-y-3">
          {rows.map(s => (
            <SavedSearchRow key={s.id} search={s} />
          ))}
        </div>
      )}
    </div>
  )
}
