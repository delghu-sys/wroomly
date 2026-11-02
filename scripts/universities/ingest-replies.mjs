/**
 * Bring replies from a mailbox into the dashboard (/admin/universities → Replies).
 *
 *   node --env-file=.env.local scripts/universities/ingest-replies.mjs messages.json            (dry run)
 *   node --env-file=.env.local scripts/universities/ingest-replies.mjs messages.json --write
 *
 * `messages.json` is an array of:
 *   { source: "gmail", externalId, messageIdHeader?, from, fromName?, to?,
 *     subject?, body?, receivedAt }
 * Claude produces it by searching the umich mailbox for replies from the
 * universities (see docs/university-outreach.md → "Replies"); the same function
 * also backs the Resend inbound webhook once that is switched on.
 *
 * The dry run shows, for every message, what it is (auto-reply / person /
 * opt-out / bounce), which university it belongs to, and what would change.
 * Nothing is ever SENT from here. Re-running is safe: a message is stored once.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { classifyInbound, matchProspect } from '../../src/lib/universities/replies.ts'
import { ingestMessages } from '../../src/lib/universities/replies-runner.ts'

const file = process.argv[2]
const write = process.argv.includes('--write')
if (!file || file.startsWith('--')) { console.error('usage: ingest-replies.mjs messages.json [--write]'); process.exit(1) }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
const db = createClient(url, key, { auth: { persistSession: false } })

const messages = JSON.parse(readFileSync(file, 'utf8'))
if (!Array.isArray(messages)) throw new Error('messages.json must be an array')

if (!write) {
  const { data } = await db.from('university_prospects').select('id, name, country, contact_email, status')
  console.log(`${messages.length} message(s) — DRY RUN, nothing written\n`)
  for (const m of messages) {
    const c = classifyInbound({ from: m.from, subject: m.subject ?? null, body: m.body ?? null })
    const hit = matchProspect(m.from, data ?? [])
    console.log(`• ${m.from}  "${(m.subject ?? '').slice(0, 60)}"`)
    console.log(`    reads as : ${c.kind} (${c.reason})${c.holdDays ? ` — hold follow-up ${c.holdDays} days` : ''}`)
    console.log(`    matches  : ${hit.prospect ? `${hit.prospect.name} (by ${hit.how})` : `no university (${hit.how})`}`)
    const full = (data ?? []).find(p => p.id === hit.prospect?.id)
    console.log(`    would    : ${c.kind === 'opt_out' ? 'suppress the address and mark the university declined' : c.kind === 'human_reply' ? `${full?.status === 'sent' ? 'mark the university replied, and ' : ''}put it in your inbox with a send time` : 'record it; nothing to answer'}\n`)
  }
  console.log('Re-run with --write to store them.')
  process.exit(0)
}

const results = await ingestMessages(db, messages)
for (const r of results) console.log(r.duplicate ? `= already stored  ${r.externalId}` : `+ ${String(r.kind).padEnd(11)} ${String(r.university ?? '(no university)').padEnd(34)} ${r.effect ?? ''}`)
console.log(`\n${results.filter(r => !r.duplicate).length} new, ${results.filter(r => r.duplicate).length} already stored.`)
