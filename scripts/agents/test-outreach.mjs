/**
 * Send ONE real outreach email to an address you control, to check the whole
 * chain end to end before any stranger receives anything.
 *
 *   node --env-file=.env.local scripts/agents/test-outreach.mjs --to you@example.com
 *   node --env-file=.env.local scripts/agents/test-outreach.mjs --to you@example.com --send
 *
 * The logic lives in runTestSend() in src/lib/agents/runner.ts and is shared
 * with the "Send me a test" button at /admin/agents — same lead selection,
 * same template, same claim-link pre-flight, same email.
 *
 * NOTE: this needs a working RESEND_API_KEY in the env file. .env.local ships
 * with a placeholder, so the button in the deployed console is usually the
 * easier route — Vercel has the real key.
 */
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { runTestSend } from '../../src/lib/agents/runner.ts'

const arg = name => {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}
const execute = process.argv.includes('--send')
const to = arg('--to')
const leadId = arg('--lead')

// Default to production, NOT NEXT_PUBLIC_APP_URL: locally that is
// http://localhost:3000, which would put a dead claim link in a real email.
const origin = arg('--origin') ?? 'https://wroomly.app'

if (!to) {
  console.error('--to <address> is required. This script never picks a recipient for you.')
  process.exit(1)
}

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

const r = await runTestSend(db, { to, send, execute, leadId, origin })

if (r.lead) {
  console.log('LEAD')
  console.log(`  id        ${r.lead.id}`)
  console.log(`  title     ${r.lead.title ?? '(untitled)'}`)
  console.log(`  source    ${r.lead.source}`)
  console.log(`  real contact (NOT used): …@${r.lead.contactDomain}`)
}

if (r.linkChecks.length > 0) {
  console.log('\nCLAIM LINK PRE-FLIGHT')
  for (const c of r.linkChecks) console.log(`  ${c.ok ? 'OK  ' : 'FAIL'}  ${c.label}`)
}

if (r.email) {
  console.log('\nEMAIL')
  console.log(`  to        ${r.email.to}`)
  console.log(`  subject   ${r.email.subject}`)
  console.log(`  header    List-Unsubscribe: <${r.email.listUnsubscribe}>`)
  console.log('\n' + '─'.repeat(72))
  console.log(r.email.text)
  console.log('─'.repeat(72))
}

if (r.error) {
  console.error(`\n${r.error}`)
  process.exit(1)
}
if (r.sent) {
  console.log('\nSent. Lead left untouched — still drafted, token intact.')
} else {
  console.log('\nDry run. Add --send to actually deliver it.')
}
