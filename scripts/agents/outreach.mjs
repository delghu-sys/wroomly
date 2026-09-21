/**
 * Outreach agent (terminal entry point). The logic — and every rule about who
 * may be contacted — lives in src/lib/agents/runner.ts + outreach-policy.ts
 * and is shared with the admin console at /admin/agents.
 *
 *   node --env-file=.env.local scripts/agents/outreach.mjs             (dry run)
 *   OUTREACH_ENABLED=true node --env-file=.env.local scripts/agents/outreach.mjs --send
 *
 * Claim links point at https://wroomly.app unless --origin says otherwise.
 *
 * Sending requires BOTH --send here and OUTREACH_ENABLED=true (checked inside
 * the runner, so the console can't bypass it either).
 */
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { runOutreach } from '../../src/lib/agents/runner.ts'

const execute = process.argv.includes('--send')

// Deliberately NOT NEXT_PUBLIC_APP_URL: in .env.local that is
// http://localhost:3000, and this script mails real strangers. A claim link
// pointing at a laptop is a dead link, and the token is dropped once sent, so
// the lead is burned for good. Default to the live site; override explicitly
// with --origin (the runner refuses to send to a non-public one anyway).
const originFlag = process.argv.indexOf('--origin')
const origin = originFlag === -1 ? 'https://wroomly.app' : process.argv[originFlag + 1]

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
const db = createClient(url, key, { auth: { persistSession: false } })

const resend = new Resend(process.env.RESEND_API_KEY)
const send = async ({ to, subject, text, listUnsubscribe }) => {
  const { error } = await resend.emails.send({
    from: 'Wroomly <notifications@wroomly.app>',
    to,
    subject,
    text,
    headers: { 'List-Unsubscribe': `<${listUnsubscribe}>` },
  })
  if (error) throw new Error(error.message)
}

const r = await runOutreach(db, { execute, send, origin })
console.log(`claim links point at ${origin}`)
console.log(`cap ${r.dailyCap}/day · ${r.sentInLastDay} sent in last 24h`)
console.log(`${r.planned} to send`)
for (const [reason, n] of Object.entries(r.skipped)) console.log(`   skipped ${String(n).padStart(3)} — ${reason}`)
for (const e of r.errors) console.error(`error: ${e}`)

if (!execute) {
  console.log('\nDry run. To actually send: OUTREACH_ENABLED=true … --send')
} else if (!r.enabled) {
  console.log('\n--send given but OUTREACH_ENABLED is not "true" — nothing sent.')
} else {
  console.log(`\nSent ${r.sent}.`)
}
