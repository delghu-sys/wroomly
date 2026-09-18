/**
 * Outreach agent. Sends ONE email per person, ever, telling them a draft is
 * waiting and how to ignore it.
 *
 *   node --env-file=.env.local scripts/agents/outreach.mjs             (dry run)
 *   OUTREACH_ENABLED=true node --env-file=.env.local scripts/agents/outreach.mjs --send
 *
 * Sending requires BOTH the --send flag and OUTREACH_ENABLED=true. Two
 * independent switches, because a stray cron line or a copied command should
 * not be able to start mailing strangers.
 *
 * Who may be contacted is decided by src/lib/agents/outreach-policy.ts, not
 * here — it is pure and unit-tested, because every rule in it is one where a
 * bug means mailing somebody we promised not to mail.
 */
import { createClient } from '@supabase/supabase-js'
import { planOutreach } from '../../src/lib/agents/outreach-policy.ts'
import { unsubscribeUrl } from '../../src/lib/agents/unsubscribe-token.ts'

const send = process.argv.includes('--send') && process.env.OUTREACH_ENABLED === 'true'
const DAILY_CAP = Number(process.env.OUTREACH_DAILY_CAP ?? 25)
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'
// CAN-SPAM requires a real postal address in every commercial message.
const POSTAL = 'Wroomly LLC, 1912 Geddes Ave, Ann Arbor, MI 48104'

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  return createClient(url, key, { auth: { persistSession: false } })
}
const redact = e => (e ? e.replace(/^(.).*@(.*)$/, '$1***@$2') : '—')

function body({ title, claimUrl, unsubUrl }) {
  // Plain, honest, and short. It says where we saw them, what we made, that it
  // is not public, and how to make it stop — in the first screenful.
  return `Hi,

We saw your sublet post ("${title}") on the Ann Arbor sublet board.

Wroomly is a free sublet marketplace for the U-M community. We've pre-filled a
listing draft from your post so you don't have to retype it. It is NOT public —
nobody can see it unless you claim it and publish it yourself:

${claimUrl}

The link works for 7 days. If you're not interested, ignore this and nothing
happens: the draft expires unpublished and we won't email you again.

Never want to hear from us? ${unsubUrl}

${POSTAL}`
}

async function main() {
  const supabase = db()

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [{ data: candidates, error: cErr }, { data: sups }, { count: sentInLastDay }] = await Promise.all([
    supabase.from('sourced_leads')
      .select('id, contact_email, status, import_request_id, outreach_sent_at, title, extracted')
      .eq('status', 'drafted').is('outreach_sent_at', null).limit(200),
    supabase.from('outreach_suppressions').select('email'),
    supabase.from('sourced_leads')
      .select('id', { count: 'exact', head: true }).gte('outreach_sent_at', since),
  ])
  if (cErr) throw new Error(cErr.message)

  const plan = planOutreach({
    candidates: candidates ?? [],
    suppressed: (sups ?? []).map(s => s.email),
    sentInLastDay: sentInLastDay ?? 0,
    dailyCap: DAILY_CAP,
  })

  console.log(`cap ${DAILY_CAP}/day · ${sentInLastDay ?? 0} sent in last 24h · ${plan.capRemaining} remaining`)
  console.log(`${plan.send.length} to send, ${plan.skipped.length} skipped`)
  const why = {}
  for (const s of plan.skipped) why[s.reason] = (why[s.reason] ?? 0) + 1
  for (const [reason, n] of Object.entries(why)) console.log(`   skipped ${String(n).padStart(3)} — ${reason}`)

  if (!send) {
    for (const c of plan.send.slice(0, 5)) console.log(`  [dry] would email ${redact(c.contact_email)}`)
    console.log('\nDry run. To actually send: OUTREACH_ENABLED=true … --send')
    return
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  for (const c of plan.send) {
    const token = c.extracted?._claimToken
    if (!token) { console.warn(`  no claim token on lead ${c.id}; skipping`); continue }
    const claimUrl = `${ORIGIN}/claim-listing/${token}`

    try {
      await resend.emails.send({
        from: 'Wroomly <notifications@wroomly.app>',
        to: c.contact_email,
        subject: 'A listing draft for your Ann Arbor sublet (not published)',
        text: body({ title: c.title ?? 'your sublet', claimUrl, unsubUrl: unsubscribeUrl(c.contact_email, ORIGIN) }),
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl(c.contact_email, ORIGIN)}>` },
      })
    } catch (err) {
      console.error(`  send failed for ${redact(c.contact_email)}: ${err.message}`)
      continue
    }

    // Mark sent AND drop the raw claim token: the email is the only place it is
    // ever revealed, so it should not linger in our database afterwards.
    const { _claimToken, ...rest } = c.extracted ?? {}
    await supabase.from('sourced_leads')
      .update({ status: 'contacted', outreach_sent_at: new Date().toISOString(), extracted: rest })
      .eq('id', c.id)
    console.log(`  emailed ${redact(c.contact_email)}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
