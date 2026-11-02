/**
 * Load the researched partner-university list into the database.
 *
 *   node --env-file=.env.local scripts/universities/import.mjs            (dry run)
 *   node --env-file=.env.local scripts/universities/import.mjs --write
 *
 * Reads data/university-prospects.json (or --file <path>). Every entry goes
 * through normalizeProspect, which DROPS an address that has no source page
 * and any private mailbox, so a guessed address cannot get in. Re-running is
 * safe: only the research columns are written, so a university that is already
 * drafted, approved or sent keeps its status and message.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { normalizeProspect, mergeProspects } from '../../src/lib/universities/import.ts'

const write = process.argv.includes('--write')
const fileIdx = process.argv.indexOf('--file')
const file = fileIdx === -1 ? 'data/university-prospects.json' : process.argv[fileIdx + 1]

const raw = JSON.parse(readFileSync(file, 'utf8'))
const normalized = []
for (const r of raw) {
  const n = normalizeProspect(r)
  if ('error' in n) { console.log(`skip: ${n.error} — ${JSON.stringify(r).slice(0, 80)}`); continue }
  for (const d of n.dropped) console.log(`  ! ${n.ok.name}: ${d}`)
  normalized.push(n.ok)
}
const rows = mergeProspects(normalized)

const by = (f) => rows.reduce((m, r) => ((m[f(r)] = (m[f(r)] || 0) + 1), m), {})
console.log(`\n${raw.length} entries → ${rows.length} universities`)
console.log('confidence:', by(r => r.confidence))
console.log('with an email:', rows.filter(r => r.contact_email).length, '| form only:', rows.filter(r => !r.contact_email && r.contact_form_url).length)
console.log('countries:', Object.keys(by(r => r.country ?? '?')).length)

if (!write) { console.log('\nDry run — nothing written. Re-run with --write.'); process.exit(0) }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
const db = createClient(url, key, { auth: { persistSession: false } })

const { error } = await db.from('university_prospects').upsert(rows, { onConflict: 'slug' })
if (error) {
  console.error(error.code === '42P01' ? 'Migration 044 has not been applied yet.' : error.message)
  process.exit(1)
}
console.log(`\nWrote ${rows.length} universities.`)
