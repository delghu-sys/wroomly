/**
 * Re-read the record fields the adapter learned to extract after these leads
 * were gathered: the post date, and the board's own normalised address.
 *
 *   node --env-file=.env.local scripts/agents/backfill-listing-fields.mjs            (dry run)
 *   node --env-file=.env.local scripts/agents/backfill-listing-fields.mjs --write
 *
 * `postedAt` is what makes a year-less term ("January to August") readable,
 * and therefore what lets an old post be recognised as stale rather than
 * merely undated. `addressLine`/`postalCode` are the board's geocoded result,
 * tidier than the free-text title ("327 S Division St" vs "327 S. Division").
 *
 * Writes ONLY those three keys, merged over whatever is already there, so a
 * re-read can never rewrite the contact address or any other scraped value.
 * Coordinates sit beside them in the payload and are deliberately not taken.
 */
import { createClient } from '@supabase/supabase-js'
import { extractContact } from '../../src/lib/agents/sources/offcampus-universe.ts'

const write = process.argv.includes('--write')
const UA = 'WroomlyBot/1.0 (+https://wroomly.app)'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
const db = createClient(url, key, { auth: { persistSession: false } })

const { data: leads, error } = await db
  .from('sourced_leads')
  .select('id, title, source, source_url, extracted, status')
  .eq('source', 'offcampus-universe-umich')
  .in('status', ['new', 'drafted'])
if (error) throw new Error(error.message)

let filled = 0
let already = 0
let failed = 0

for (const lead of leads ?? []) {
  const label = (lead.title ?? '(untitled)').slice(0, 30).padEnd(32)
  const missing =
    typeof lead.extracted?.postedAt !== 'string' || typeof lead.extracted?.addressLine !== 'string'
  if (!missing) {
    console.log(`${label} have   ${lead.extracted.postedAt.slice(0, 10)}  ${lead.extracted.addressLine}`)
    already += 1
    continue
  }
  if (!lead.source_url) {
    console.log(`${label} SKIP   no source url`)
    failed += 1
    continue
  }

  let found
  try {
    const html = await fetch(lead.source_url, { headers: { 'User-Agent': UA } }).then(r => r.text())
    const c = extractContact(html)
    found = { postedAt: c.postedAt, addressLine: c.addressLine, postalCode: c.postalCode }
  } catch (err) {
    console.log(`${label} ERROR  ${err instanceof Error ? err.message : err}`)
    failed += 1
    continue
  }

  // Keep only what the record actually carried; undefined must not overwrite
  // a value an earlier run already stored.
  const patch = Object.fromEntries(Object.entries(found).filter(([, v]) => typeof v === 'string' && v))
  if (Object.keys(patch).length === 0) {
    console.log(`${label} none   payload carried none of these fields`)
    failed += 1
    continue
  }
  const summary = [
    patch.postedAt ? `posted ${patch.postedAt.slice(0, 10)}` : null,
    patch.addressLine ? `"${patch.addressLine}"` : null,
    patch.postalCode ? patch.postalCode : null,
  ]
    .filter(Boolean)
    .join('  ')

  if (!write) {
    console.log(`${label} would set  ${summary}`)
    filled += 1
    continue
  }

  // Merge, never replace: everything else scraped stays exactly as it was.
  const { error: upErr } = await db
    .from('sourced_leads')
    .update({ extracted: { ...(lead.extracted ?? {}), ...patch } })
    .eq('id', lead.id)
  if (upErr) {
    console.log(`${label} ERROR  ${upErr.message}`)
    failed += 1
    continue
  }
  console.log(`${label} set    ${summary}`)
  filled += 1
  await new Promise(r => setTimeout(r, 400)) // pace the board, same as discovery
}

console.log(`\n${filled} filled · ${already} already had one · ${failed} unavailable`)
if (!write) console.log('Dry run — nothing written. Re-run with --write.')
