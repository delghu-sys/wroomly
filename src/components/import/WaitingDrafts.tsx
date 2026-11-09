import { createServiceClient } from '@/lib/supabase/server'
import { canResumeDraft, escapeLike } from '@/lib/listing-import/waiting-drafts'
import { Sparkles, ArrowRight } from 'lucide-react'

interface Row {
  id: string
  status: string
  listing_id: string | null
  email: string | null
  claimed_by_user_id: string | null
  created_at: string
  extracted_data: { title?: string | null; availableFrom?: string | null; availableTo?: string | null } | null
}

/**
 * "Finish your listing" — approved import drafts this account owns but never
 * published (lib/listing-import/waiting-drafts). Before this card a draft was
 * reachable only through a 7-day emailed link, and most of them were lost.
 * Server component; renders nothing when there is nothing to finish.
 */
export async function WaitingDrafts({ user }: { user: { id: string; email: string | null | undefined } }) {
  const service = createServiceClient()
  const cols = 'id, status, listing_id, email, claimed_by_user_id, created_at, extracted_data'
  const [held, byEmail] = await Promise.all([
    service.from('listing_import_requests').select(cols).eq('status', 'completed').is('listing_id', null).eq('claimed_by_user_id', user.id).limit(10),
    user.email
      ? service.from('listing_import_requests').select(cols).eq('status', 'completed').is('listing_id', null).ilike('email', escapeLike(user.email.trim())).limit(10)
      : Promise.resolve({ data: [] as Row[] }),
  ])

  const seen = new Set<string>()
  const drafts = [...((held.data ?? []) as Row[]), ...((byEmail.data ?? []) as Row[])]
    .filter(r => !seen.has(r.id) && seen.add(r.id) && canResumeDraft(r, user))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  if (drafts.length === 0) return null

  return (
    <section aria-label="Drafts waiting for you" className="mb-10 rounded-3xl border border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)] p-6">
      <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-gold-deep font-bold mb-2">
        <Sparkles className="w-3.5 h-3.5" aria-hidden /> {drafts.length === 1 ? 'A draft is waiting' : `${drafts.length} drafts are waiting`}
      </p>
      <h2 className="font-display text-xl tracking-tight text-ink">Finish your listing</h2>
      <p className="text-[14px] text-ink-muted mt-1">
        We already turned your post into a draft. Check the details and publish. Nothing goes live until you confirm.
      </p>
      <ul className="mt-4 space-y-3">
        {drafts.map(d => {
          const x = d.extracted_data ?? {}
          return (
            <li key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{x.title ?? 'Your sublet draft'}</p>
                {(x.availableFrom || x.availableTo) && (
                  <p className="text-[13px] text-ink-muted">{x.availableFrom ?? '?'} → {x.availableTo ?? '?'}</p>
                )}
              </div>
              <form action="/api/listing-imports/resume" method="post" className="shrink-0">
                <input type="hidden" name="requestId" value={d.id} />
                <button type="submit" className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition">
                  Finish and publish <ArrowRight className="w-4 h-4" aria-hidden />
                </button>
              </form>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
