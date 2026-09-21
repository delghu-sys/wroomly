/**
 * Fetch the board's post date for leads gathered before the adapter read it.
 *
 *   node --env-file=.env.local scripts/agents/backfill-post-dates.mjs            (dry run)
 *   node --env-file=.env.local scripts/agents/backfill-post-dates.mjs --write
 *
 * A term with no year ("January to August") is unreadable on its own but
 * unambiguous against the post date, which is what lets an old post be
 * recognised as stale rather than merely undated. Leads scraped before that
 * was captured have no `postedAt`, so this re-reads just that one field.
 *
 * Writes ONLY extracted.postedAt — never touches the contact address or any
 * other scraped field, so a re-read can't quietly rewrite a lead.
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
  if (typeof lead.extracted?.postedAt === 'string') {
    console.log(`${label} have   ${lead.extracted.postedAt.slice(0, 10)}`)
    already += 1
    continue
  }
  if (!lead.source_url) {
    console.log(`${label} SKIP   no source url`)
    failed += 1
    continue
  }

  let postedAt
  try {
    const html = await fetch(lead.source_url, { headers: { 'User-Agent': UA } }).then(r => r.text())
    postedAt = extractContact(html).postedAt
  } catch (err) {
    console.log(`${label} ERROR  ${err instanceof Error ? err.message : err}`)
    failed += 1
    continue
  }
  if (!postedAt) {
    console.log(`${label} none   payload carried no _createdDate`)
    failed += 1
    continue
  }

  if (!write) {
    console.log(`${label} would set  ${postedAt.slice(0, 10)}  (dates: ${lead.extracted?.dates ?? '—'})`)
    filled += 1
    continue
  }

  // Merge, never replace: everything else scraped stays exactly as it was.
  const { error: upErr } = await db
    .from('sourced_leads')
    .update({ extracted: { ...(lead.extracted ?? {}), postedAt } })
    .eq('id', lead.id)
  if (upErr) {
    console.log(`${label} ERROR  ${upErr.message}`)
    failed += 1
    continue
  }
  console.log(`${label} set    ${postedAt.slice(0, 10)}  (dates: ${lead.extracted?.dates ?? '—'})`)
  filled += 1
  await new Promise(r => setTimeout(r, 400)) // pace the board, same as discovery
}

console.log(`\n${filled} filled · ${already} already had one · ${failed} unavailable`)
if (!write) console.log('Dry run — nothing written. Re-run with --write.')
