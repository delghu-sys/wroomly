/**
 * One-time repair for drafts created before the status/shape fix in PR #61.
 *
 *   node --env-file=.env.local scripts/agents/backfill-stale-drafts.mjs            (dry run)
 *   node --env-file=.env.local scripts/agents/backfill-stale-drafts.mjs --write
 *
 * Before that fix, runDraft() wrote listing_import_requests.status='pending'
 * (the claim page requires 'completed' — every such claim link 404s) and
 * extracted_data as the raw scraped bag, not a real ExtractedListingDraft
 * (missing `photos`, which the claim page's ClaimReview component calls
 * .filter() on unconditionally — a crash waiting behind the first bug).
 *
 * Scoped tightly: only touches listing_import_requests rows reachable from a
 * sourced_leads row (source_external_id + import_request_id), so a 'pending'
 * row from the OTHER, unrelated AI-import pipeline is never touched. Detects
 * "already fixed" by checking for a `photos` array — safe to re-run.
 */
import { createClient } from '@supabase/supabase-js'
import { leadToExtractedDraft } from '../../src/lib/agents/to-draft.ts'
import { SOURCES } from '../../src/lib/agents/runner.ts'

const write = process.argv.includes('--write')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
const db = createClient(url, key, { auth: { persistSession: false } })

const { data: leads, error } = await db
  .from('sourced_leads')
  .select('id, source, title, contact_email, import_request_id')
  .not('import_request_id', 'is', null)
if (error) throw new Error(error.message)

let checked = 0
let fixed = 0
for (const lead of leads) {
  checked += 1
  const { data: req } = await db
    .from('listing_import_requests')
    .select('id, status, extracted_data')
    .eq('id', lead.import_request_id)
    .maybeSingle()
  if (!req) continue

  const alreadyFixed = Array.isArray(req.extracted_data?.photos)
  if (alreadyFixed && req.status === 'completed') continue

  console.log(`stale: lead ${lead.id.slice(0, 8)} / req ${req.id.slice(0, 8)} (status=${req.status}, shaped=${alreadyFixed})`)
  if (!write) { fixed += 1; continue }

  const draft = leadToExtractedDraft({
    title: lead.title,
    sourceLabel: SOURCES.find(s => s.key === lead.source)?.label ?? lead.source,
    contactEmail: lead.contact_email,
    extracted: alreadyFixed ? {} : (req.extracted_data ?? {}),
  })
  // If it was already properly shaped but just had the wrong status, keep the
  // existing (possibly admin-edited) content instead of re-deriving it.
  const extracted_data = alreadyFixed ? req.extracted_data : draft

  const { error: upErr } = await db
    .from('listing_import_requests')
    .update({ status: 'completed', extracted_data })
    .eq('id', req.id)
  if (upErr) { console.error(`  failed: ${upErr.message}`); continue }
  fixed += 1
}

console.log(`\n${checked} lead(s) with a draft checked, ${fixed} ${write ? 'fixed' : 'would be fixed'}.`)
if (!write) console.log('Dry run — nothing written. Re-run with --write.')
