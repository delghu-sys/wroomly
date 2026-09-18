/**
 * Drafting agent (terminal entry point). The logic lives in
 * src/lib/agents/runner.ts and is shared with the admin console at
 * /admin/agents — this file only parses flags and prints.
 *
 *   node --env-file=.env.local scripts/agents/draft.mjs            (dry run)
 *   node --env-file=.env.local scripts/agents/draft.mjs --write
 *
 * A draft is a PENDING listing_import_requests row — the same table and claim
 * flow the AI importer uses — so there is exactly one way a listing can go
 * live: a human claims it at /claim-listing/<token> and publishes it.
 */
import { createClient } from '@supabase/supabase-js'
import { runDraft } from '../../src/lib/agents/runner.ts'

const execute = process.argv.includes('--write')
const limit = Number(process.env.AGENT_DRAFT_LIMIT ?? 25)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
const db = createClient(url, key, { auth: { persistSession: false } })

const r = await runDraft(db, { execute, limit })
console.log(`${r.candidates} lead(s) with a contact and no draft yet`)
console.log(`${execute ? 'drafted' : 'would draft'}: ${r.drafted}`)
if (r.skippedSuppressed) console.log(`skipped (opted out): ${r.skippedSuppressed}`)
for (const e of r.errors) console.error(`error: ${e}`)
console.log(execute ? '\nDone.' : '\nDry run — nothing written. Re-run with --write.')
