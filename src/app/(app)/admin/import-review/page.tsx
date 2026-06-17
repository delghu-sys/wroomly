import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'
import { ArrowRight, Inbox } from 'lucide-react'
import type { ExtractedListingDraft } from '@/types/listing-import'

export const metadata: Metadata = {
  title: 'AI imports to review',
  robots: { index: false, follow: false },
}

export default async function AdminImportReviewIndex() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const service = createServiceClient()
  const { data: me } = await service
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()
  if ((me as { user_type?: string } | null)?.user_type !== 'admin') redirect('/dashboard')

  const { data: pending } = await service
    .from('listing_import_requests')
    .select('id, email, extracted_data, created_at, personal_image_paths')
    .eq('status', 'awaiting_admin_review')
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (pending ?? []) as {
    id: string
    email: string
    extracted_data: ExtractedListingDraft | null
    created_at: string
    personal_image_paths: string[] | null
  }[]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
          {rows.length} awaiting review
        </p>
        <h1 className="font-display text-4xl tracking-tight text-ink">AI imports to review</h1>
        <p className="text-ink-muted mt-2">
          Approve to send the submitter their claim email. Nothing reaches them until you do.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border border-dashed border-line bg-surface/60">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-navy-soft text-navy items-center justify-center mb-4">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="font-display text-2xl text-ink">Nothing to review</p>
          <p className="text-sm text-ink-muted mt-2">New AI imports will show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <Link
              key={r.id}
              href={`/admin/import-review/${r.id}`}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 hover:border-[oklch(0.84_0.17_85/0.45)] transition"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">
                  {r.extracted_data?.title ?? 'Untitled draft'}
                </p>
                <p className="text-[13px] text-ink-muted mt-0.5">
                  {r.email} · {(r.personal_image_paths?.length ?? 0)} photo(s) ·{' '}
                  {format(parseISO(r.created_at), 'MMM d, h:mm a')}
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-navy group-hover:gap-2 transition-all">
                Review <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
