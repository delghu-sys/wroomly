/**
 * Drafting agent. Turns a discovered lead into a PENDING, claimable draft.
 *
 *   node --env-file=.env.local scripts/agents/draft.mjs            (dry run)
 *   node --env-file=.env.local scripts/agents/draft.mjs --write
 *
 * The draft is a `listing_import_requests` row — the same table and the same
 * claim flow the AI importer already uses, so there is exactly one way a
 * listing can go live: a human claims it at /claim-listing/<token> and
 * publishes it themselves.
 *
 * Nothing here is published, and no photos are copied. We store the facts the
 * adapter parsed plus a link back to the original post; if the resident claims
 * the draft they add their own photos at that point.
 *
 * Only leads WITH a contact get drafted — a draft exists so we have something
 * to offer the person, and there is no point preparing one we cannot tell them
 * about.
 */
import { createClient } from '@supabase/supabase-js'
import { generateClaimToken, hashClaimToken, claimTokenExpiry } from '../../src/lib/listing-import/claim-token.ts'

const write = process.argv.includes('--write')
const LIMIT = Number(process.env.AGENT_DRAFT_LIMIT ?? 25)

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  return createClient(url, key, { auth: { persistSession: false } })
}
const redact = e => (e ? e.replace(/^(.).*@(.*)$/, '$1***@$2') : '—')

async function main() {
  const supabase = db()

  const { data: leads, error } = await supabase
    .from('sourced_leads')
    .select('id, source, source_url, title, contact_email, extracted')
    .eq('status', 'new')
    .not('contact_email', 'is', null)
    .limit(LIMIT)
  if (error) throw new Error(error.message)

  console.log(`${leads.length} lead(s) ready to draft${write ? '' : ' (dry run)'}`)

  for (const lead of leads) {
    // An opted-out address must never get a draft prepared for it either.
    const { data: sup } = await supabase
      .from('outreach_suppressions')
      .select('email')
      .eq('email', lead.contact_email.toLowerCase())
      .maybeSingle()
    if (sup) {
      console.log(`  skip ${redact(lead.contact_email)} — suppressed`)
      if (write) await supabase.from('sourced_leads')
        .update({ status: 'skipped', skip_reason: 'suppressed' }).eq('id', lead.id)
      continue
    }

    if (!write) { console.log(`  [dry] would draft "${lead.title}" for ${redact(lead.contact_email)}`); continue }

    const token = generateClaimToken()
    const { data: req, error: reqErr } = await supabase
      .from('listing_import_requests')
      .insert({
        email: lead.contact_email,
        personal_source_url: lead.source_url,
        // Facts only. `consent_confirmed` stays FALSE: the resident has not
        // agreed to anything yet — claiming the draft is that consent.
        consent_confirmed: false,
        status: 'pending',
        extracted_data: { ...lead.extracted, sourcedFrom: lead.source, title: lead.title },
        claim_token_hash: hashClaimToken(token),
        claim_token_expires_at: claimTokenExpiry().toISOString(),
      })
      .select('id')
      .single()
    if (reqErr) { console.error(`  draft failed for ${redact(lead.contact_email)}: ${reqErr.message}`); continue }

    // The raw token is stored on the lead ONLY until outreach sends it, because
    // the email is the only place it is ever revealed. outreach.mjs clears it.
    const { error: upErr } = await supabase
      .from('sourced_leads')
      .update({ status: 'drafted', import_request_id: req.id, extracted: { ...lead.extracted, _claimToken: token } })
      .eq('id', lead.id)
    if (upErr) { console.error(`  lead update failed: ${upErr.message}`); continue }

    console.log(`  drafted for ${redact(lead.contact_email)} → import_request ${req.id}`)
  }

  if (!write) console.log('\nDry run — nothing written. Re-run with --write.')
}

main().catch(err => { console.error(err); process.exit(1) })
