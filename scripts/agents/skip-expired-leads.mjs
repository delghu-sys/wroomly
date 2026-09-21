/**
 * Take leads whose term has already finished out of the send plan.
 *
 *   node --env-file=.env.local scripts/agents/skip-expired-leads.mjs            (dry run)
 *   node --env-file=.env.local scripts/agents/skip-expired-leads.mjs --write
 *
 * sanitizeLeads now refuses to IMPORT an expired post, but that only applies
 * at discovery time — leads gathered before it still sit in the queue. This
 * marks them 'skipped', which removes them from planOutreach's send list for
 * good (it only considers 'drafted'), and shows the reason in the console.
 *
 * Marks rather than deletes: the row is the record of having seen that post,
 * and dedupe on re-discovery depends on it. Never touches a lead that has
 * already been emailed, or whose draft someone has claimed — by then it is
 * their listing, not our queue entry.
 */
import { createClient } from '@supabase/supabase-js'
import { termHasEnded } from '../../src/lib/agents/prefill.ts'

const write = process.argv.includes('--write')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
const db = createClient(url, key, { auth: { persistSession: false } })

const { data: leads, error } = await db
  .from('sourced_leads')
  .select('id, title, status, extracted, import_request_id, outreach_sent_at')
  .in('status', ['new', 'drafted'])
  .is('outreach_sent_at', null)
if (error) throw new Error(error.message)

let expired = 0
let kept = 0
let skippedSafe = 0

for (const lead of leads ?? []) {
  const label = (lead.title ?? '(untitled)').slice(0, 32).padEnd(34)
  const dates = typeof lead.extracted?.dates === 'string' ? lead.extracted.dates : null

  if (!termHasEnded(dates)) {
    console.log(`${label} keep    ${dates ?? '(no dates)'}`)
    kept += 1
    continue
  }

  // Someone holding the draft owns it now; leave their row alone.
  if (lead.import_request_id) {
    const { data: req } = await db
      .from('listing_import_requests')
      .select('claimed_by_user_id, listing_id')
      .eq('id', lead.import_request_id)
      .maybeSingle()
    if (req?.claimed_by_user_id || req?.listing_id) {
      console.log(`${label} LEAVE   expired but claimed/published`)
      skippedSafe += 1
      continue
    }
  }

  if (!write) {
    console.log(`${label} would skip  term ended: ${dates}`)
    expired += 1
    continue
  }

  const { error: upErr } = await db
    .from('sourced_leads')
    .update({ status: 'skipped', skip_reason: `term already ended ("${dates}")` })
    .eq('id', lead.id)
    .is('outreach_sent_at', null)
  if (upErr) {
    console.log(`${label} ERROR   ${upErr.message}`)
    continue
  }
  console.log(`${label} skipped     term ended: ${dates}`)
  expired += 1
}

console.log(`\n${expired} expired · ${kept} still live · ${skippedSafe} left alone (claimed)`)
if (!write) console.log('Dry run — nothing written. Re-run with --write.')
