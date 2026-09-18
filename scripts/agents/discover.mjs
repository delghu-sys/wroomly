/**
 * Discovery agent. Runs the enabled source adapters and records what they find
 * as `sourced_leads` rows.
 *
 *   node --env-file=.env.local scripts/agents/discover.mjs            (dry run)
 *   node --env-file=.env.local scripts/agents/discover.mjs --write
 *
 * Nothing is fetched unless a source is named in AGENT_SOURCES, so adding an
 * adapter to the repo does not start scraping anything:
 *
 *   AGENT_SOURCES=cmb-resident-sublets
 *
 * Discovery is idempotent: leads are keyed on (source, source_external_id) with
 * a unique index, so re-running adds only what is genuinely new. That is what
 * guarantees nobody is ever discovered — or later contacted — twice.
 */
import { createClient } from '@supabase/supabase-js'
import { sanitizeLeads } from '../../src/lib/agents/source-adapter.ts'
import cmbResidentSublets from './sources/cmb-resident-sublets.mjs'

const ALL_ADAPTERS = [cmbResidentSublets]

const write = process.argv.includes('--write')
const enabled = (process.env.AGENT_SOURCES ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  return createClient(url, key, { auth: { persistSession: false } })
}

/** Addresses are redacted in all logs — these are third parties, not users. */
const redact = e => (e ? e.replace(/^(.).*@(.*)$/, '$1***@$2') : '—')

async function main() {
  if (enabled.length === 0) {
    console.log('No sources enabled. Set AGENT_SOURCES to one or more of:')
    for (const a of ALL_ADAPTERS) console.log(`  ${a.key.padEnd(24)} ${a.label}`)
    console.log('\nNothing was fetched.')
    return
  }

  const adapters = ALL_ADAPTERS.filter(a => enabled.includes(a.key))
  const unknown = enabled.filter(k => !ALL_ADAPTERS.some(a => a.key === k))
  if (unknown.length) console.warn(`Unknown source(s) ignored: ${unknown.join(', ')}`)

  const supabase = write ? db() : null
  let totalNew = 0

  for (const adapter of adapters) {
    console.log(`\n── ${adapter.label} (${adapter.key})`)
    console.log(`   basis: ${adapter.contactBasis}`)

    let raw
    try {
      raw = await adapter.fetchLeads()
    } catch (err) {
      console.error(`   FETCH FAILED: ${err.message}`)
      continue
    }

    const { ok, rejected } = sanitizeLeads(raw)
    for (const r of rejected) console.warn(`   rejected: ${r.reason}`)
    console.log(`   found ${ok.length} lead(s), ${ok.filter(l => l.contactEmail).length} with a contact`)

    if (!write) {
      for (const l of ok.slice(0, 5)) console.log(`   [dry] ${l.title} — ${redact(l.contactEmail)}`)
      if (ok.length > 5) console.log(`   [dry] …and ${ok.length - 5} more`)
      continue
    }

    for (const l of ok) {
      // upsert + ignoreDuplicates: re-running never disturbs an existing lead,
      // so a lead already contacted or opted out cannot be reset by discovery.
      const { error } = await supabase
        .from('sourced_leads')
        .upsert(
          {
            source: adapter.key,
            source_external_id: l.sourceExternalId,
            source_url: l.sourceUrl ?? null,
            title: l.title ?? null,
            contact_email: l.contactEmail ?? null,
            extracted: l.extracted ?? {},
          },
          { onConflict: 'source,source_external_id', ignoreDuplicates: true },
        )
        .select('id')
      if (error) { console.error(`   insert failed: ${error.message}`); continue }
      totalNew += 1
    }
    console.log(`   wrote leads (new rows only; duplicates ignored)`)
  }

  console.log(write ? `\nDone. ${totalNew} lead row(s) written.` : '\nDry run — nothing written. Re-run with --write.')
}

main().catch(err => { console.error(err); process.exit(1) })
