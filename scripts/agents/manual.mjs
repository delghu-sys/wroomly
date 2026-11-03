/**
 * Record manual outreach (messages sent by hand on another site's messenger).
 *
 *   node --env-file=.env.local scripts/agents/manual.mjs sent  --source subleaps-a2 --id <externalId> --channel subleaps --label SubLeaps --url <conversation url> --text "<message>" [--at <ISO>]
 *   node --env-file=.env.local scripts/agents/manual.mjs reply --lead <leadId> --text "<what they wrote>" [--at <ISO>]
 *   node --env-file=.env.local scripts/agents/manual.mjs out   --lead <leadId> --kind follow-up|claim|reply --text "<what was sent>" [--at <ISO>]
 *   node --env-file=.env.local scripts/agents/manual.mjs state --lead <leadId> --state waiting|replied|listed|declined|closed
 *   node --env-file=.env.local scripts/agents/manual.mjs list
 *
 * Writes only the conversation log on the lead. Nothing is sent anywhere.
 */
import { createClient } from '@supabase/supabase-js'
import { addManualMessage, loadManualItems, recordFirstContact, setManualState } from '../../src/lib/agents/manual-runner.ts'

const [cmd, ...rest] = process.argv.slice(2)
const arg = name => {
  const i = rest.indexOf(`--${name}`)
  return i === -1 ? undefined : rest[i + 1]
}
const need = name => {
  const v = arg(name)
  if (!v) throw new Error(`--${name} is required`)
  return v
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
const db = createClient(url, key, { auth: { persistSession: false } })
const at = arg('at') ? new Date(arg('at')) : new Date()

if (cmd === 'sent') {
  const r = await recordFirstContact(db, {
    source: need('source'), externalId: need('id'), channel: need('channel'), channelLabel: arg('label') ?? need('channel'),
    conversationUrl: arg('url'), text: need('text'), at,
  })
  console.log('recorded', r.id)
} else if (cmd === 'reply') {
  await addManualMessage(db, need('lead'), { dir: 'in', at: at.toISOString(), text: need('text') })
  console.log('reply logged')
} else if (cmd === 'out') {
  await addManualMessage(db, need('lead'), { dir: 'out', at: at.toISOString(), text: need('text'), kind: need('kind') })
  console.log('sent message logged')
} else if (cmd === 'state') {
  await setManualState(db, need('lead'), need('state'))
  console.log('state set')
} else if (cmd === 'list') {
  for (const i of await loadManualItems(db)) console.log(`${i.id}  ${i.thread.state.padEnd(8)} ${i.next.due ? 'DUE ' : '    '}${i.title.slice(0, 50)}  | ${i.next.reason}`)
} else {
  console.log('Commands: sent | reply | out | state | list')
}
