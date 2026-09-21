/**
 * Re-derive existing agent drafts so they pick up the address/date prefill.
 *
 *   node --env-file=.env.local scripts/agents/backfill-prefill.mjs            (dry run)
 *   node --env-file=.env.local scripts/agents/backfill-prefill.mjs --write
 *
 * Drafts created before the prefill change left `address`, `availableFrom`
 * and `availableTo` blank even when the original post stated all three, so
 * the queue sitting here would still hand people the two most tedious fields
 * to retype. The mapper is deterministic, so simply running it again over the
 * untouched scrape is enough.
 *
 * REFUSES to touch a draft that is not still pristine:
 *   - the lead must be 'drafted' and not yet emailed
 *   - the import request must be unclaimed and unpublished
 * Once someone holds a draft, its extracted_data may contain THEIR edits, and
 * regenerating would silently throw that away. Idempotent: re-running changes
 * nothing once a draft already matches what the mapper produces.
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
  .select('id, title, source, contact_email, extracted, import_request_id, status, outreach_sent_at')
  .eq('status', 'drafted')
  .is('outreach_sent_at', null)
if (error) throw new Error(error.message)

let updated = 0
let skipped = 0
let unchanged = 0

for (const lead of leads ?? []) {
  const label = (lead.title ?? '(untitled)').slice(0, 32).padEnd(34)
  if (!lead.import_request_id) {
    console.log(`${label} SKIP  no import request`)
    skipped += 1
    continue
  }

  const { data: req } = await db
    .from('listing_import_requests')
    .select('id, extracted_data, claimed_by_user_id, listing_id')
    .eq('id', lead.import_request_id)
    .maybeSingle()

  if (!req) {
    console.log(`${label} SKIP  request row missing`)
    skipped += 1
    continue
  }
  if (req.claimed_by_user_id || req.listing_id) {
    console.log(`${label} SKIP  claimed/published — may hold the owner's own edits`)
    skipped += 1
    continue
  }

  const fresh = leadToExtractedDraft({
    title: lead.title,
    sourceLabel: SOURCES.find(s => s.key === lead.source)?.label ?? lead.source,
    contactEmail: lead.contact_email,
    extracted: lead.extracted ?? {},
  })

  const before = req.extracted_data ?? {}
  const same =
    before.address === fresh.address &&
    before.availableFrom === fresh.availableFrom &&
    before.availableTo === fresh.availableTo
  if (same) {
    console.log(`${label} ok    already current`)
    unchanged += 1
    continue
  }

  const gained = [
    before.address !== fresh.address ? `address=${JSON.stringify(fresh.address)}` : null,
    before.availableFrom !== fresh.availableFrom ? `from=${fresh.availableFrom ?? '—'}` : null,
    before.availableTo !== fresh.availableTo ? `to=${fresh.availableTo ?? '—'}` : null,
  ].filter(Boolean)

  if (!write) {
    console.log(`${label} would update  ${gained.join('  ')}`)
    updated += 1
    continue
  }

  // Guard the write itself too: if someone claims the draft between the read
  // above and here, these conditions make the update a no-op rather than a
  // silent overwrite of their work.
  const { data: rows, error: upErr } = await db
    .from('listing_import_requests')
    .update({ extracted_data: fresh })
    .eq('id', req.id)
    .is('claimed_by_user_id', null)
    .is('listing_id', null)
    .select('id')
  if (upErr) {
    console.log(`${label} ERROR ${upErr.message}`)
    skipped += 1
    continue
  }
  if (!rows || rows.length === 0) {
    console.log(`${label} SKIP  claimed while running`)
    skipped += 1
    continue
  }
  console.log(`${label} updated       ${gained.join('  ')}`)
  updated += 1
}

console.log(`\n${updated} updated · ${unchanged} already current · ${skipped} skipped`)
if (!write) console.log('Dry run — nothing written. Re-run with --write.')
