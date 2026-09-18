/**
 * Discovery agent (terminal entry point). The logic lives in
 * src/lib/agents/runner.ts and is shared with the admin console at
 * /admin/agents — this file only parses flags and prints.
 *
 *   node --env-file=.env.local scripts/agents/discover.mjs            (dry run)
 *   node --env-file=.env.local scripts/agents/discover.mjs --write
 *
 * Nothing is fetched unless a source is named in AGENT_SOURCES:
 *
 *   AGENT_SOURCES=cmb-resident-sublets
 */
import { createClient } from '@supabase/supabase-js'
import { SOURCES, runDiscover } from '../../src/lib/agents/runner.ts'

const execute = process.argv.includes('--write')
const sourceKeys = (process.env.AGENT_SOURCES ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

if (sourceKeys.length === 0) {
  console.log('No sources enabled. Set AGENT_SOURCES to one or more of:')
  for (const a of SOURCES) console.log(`  ${a.key.padEnd(24)} ${a.label}`)
  console.log('\nNothing was fetched.')
  process.exit(0)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
const db = createClient(url, key, { auth: { persistSession: false } })

const result = await runDiscover(db, { sourceKeys, execute })
for (const s of result.sources) {
  console.log(`\n── ${s.label} (${s.key})`)
  console.log(`   basis: ${s.contactBasis}`)
  if (s.error) console.log(`   ERROR: ${s.error}`)
  for (const r of s.rejected) console.log(`   rejected: ${r}`)
  console.log(`   found ${s.found} lead(s), ${s.withContact} with a contact`)
  if (execute) console.log(`   inserted ${s.inserted} new row(s) (duplicates ignored)`)
}
console.log(execute ? '\nDone.' : '\nDry run — nothing written. Re-run with --write.')
