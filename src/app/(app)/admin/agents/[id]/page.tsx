import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { AgentDraftEditor } from '@/components/admin/AgentDraftEditor'
import { leadToExtractedDraft } from '@/lib/agents/to-draft'
import { SOURCES } from '@/lib/agents/runner'
import type { ExtractedListingDraft } from '@/types/listing-import'

export const metadata: Metadata = {
  title: 'Admin: Agent lead',
  robots: { index: false, follow: false },
}

export default async function AdminAgentLeadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const service = createServiceClient()
  const { data: me } = await service.from('users').select('user_type').eq('id', user.id).single()
  if ((me as { user_type?: string } | null)?.user_type !== 'admin') redirect('/dashboard')

  const { data: lead } = await service
    .from('sourced_leads')
    .select(
      'id, status, skip_reason, title, contact_email, source, source_url, discovered_at, outreach_sent_at, import_request_id, extracted',
    )
    .eq('id', id)
    .maybeSingle()

  if (!lead) notFound()

  const { data: req } = lead.import_request_id
    ? await service
        .from('listing_import_requests')
        .select('id, extracted_data, listing_id')
        .eq('id', lead.import_request_id)
        .maybeSingle()
    : { data: null }

  // There is deliberately no claim link to show before the email goes out.
  // The token is minted at send time (see mintClaimToken in runner.ts), so
  // that the recipient gets its full 7-day life from the moment the message
  // lands rather than from whenever this draft happened to be built — and so
  // the raw credential never sits in the database waiting to be read.

  const publishedListingId = req?.listing_id ?? null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/admin/agents"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Growth agents
      </Link>

      <div className="rounded-3xl border border-line bg-surface p-5 mb-6 text-[13px] text-ink-soft space-y-1.5">
        <p>
          <span className="text-ink-muted">Source:</span>{' '}
          {lead.source_url ? (
            <a
              href={lead.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-navy hover:text-ink underline underline-offset-2"
            >
              {lead.source} <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            lead.source
          )}
        </p>
        <p>
          <span className="text-ink-muted">Contact:</span> {lead.contact_email ?? 'none published'}
        </p>
        <p>
          <span className="text-ink-muted">Status:</span> {lead.status}
          {lead.skip_reason && ` (${lead.skip_reason})`}
        </p>
        <p>
          <span className="text-ink-muted">Discovered:</span>{' '}
          {format(parseISO(lead.discovered_at), 'MMM d, yyyy h:mm a')}
          {lead.outreach_sent_at && (
            <>
              {' · '}
              <span className="text-ink-muted">Emailed:</span>{' '}
              {format(parseISO(lead.outreach_sent_at), 'MMM d, yyyy h:mm a')}
            </>
          )}
        </p>
        <p className="text-[12px] text-ink-muted">
          The claim link is created when the outreach email is sent, so it is good for a full 7 days
          from the moment it reaches the person. There is nothing to preview until then.
        </p>
      </div>

      <h1 className="font-display text-2xl tracking-tight text-ink mb-1">
        {lead.title ?? 'Untitled sublet'}
      </h1>

      {publishedListingId ? (
        <p className="text-ink-muted mt-4">
          This draft has already been claimed and published.{' '}
          <Link href={`/listings/${publishedListingId}`} className="text-navy underline underline-offset-2 hover:text-ink">
            View the live listing
          </Link>
          .
        </p>
      ) : !req ? (
        <p className="text-ink-muted mt-4">
          No draft exists yet for this lead — it hasn&rsquo;t been through the draft step. Run{' '}
          <Link href="/admin/agents" className="text-navy underline underline-offset-2 hover:text-ink">
            Draft
          </Link>{' '}
          on the growth agents console first.
        </p>
      ) : (
        <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 mt-4">
          <AgentDraftEditor importRequestId={req.id} draft={toSafeDraft(req.extracted_data, lead)} />
        </div>
      )}
    </div>
  )
}

/**
 * Defence in depth against the exact bug this page was built to fix (see
 * scripts/agents/backfill-stale-drafts.mjs): a draft with no `photos` array
 * previously crashed here, because AgentDraftEditor/ClaimReview both read it
 * unconditionally. If the stored data is ever malformed again — a future bug,
 * a manual DB edit, a row from before this pipeline existed — reconstruct a
 * valid draft from the lead's own fields on the fly rather than throwing.
 * Purely a display fallback; nothing is written back unless the admin saves.
 */
function toSafeDraft(
  extracted_data: unknown,
  lead: { source: string; title: string | null; contact_email: string | null; extracted: unknown },
): ExtractedListingDraft {
  if (extracted_data && Array.isArray((extracted_data as { photos?: unknown }).photos)) {
    return extracted_data as ExtractedListingDraft
  }
  return leadToExtractedDraft({
    title: lead.title,
    sourceLabel: SOURCES.find(s => s.key === lead.source)?.label ?? lead.source,
    contactEmail: lead.contact_email ?? '',
    extracted: (extracted_data ?? lead.extracted ?? {}) as Record<string, unknown>,
  })
}
