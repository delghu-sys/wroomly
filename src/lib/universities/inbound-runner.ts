import type { SupabaseClient } from '@supabase/supabase-js'
import { loadSettings } from './runner.ts'
import { notifyTarget } from './gate.ts'
import { buildNotice, isOwnMail, receivedEmailId, toInbound, type ReceivedEmail } from './inbound.ts'
import { draftReplyFor, ingestMessages, type IngestOutcome } from './replies-runner.ts'
import type { DrafterInput, DraftOutput } from './reply-drafter.ts'

type Db = SupabaseClient

/** Auto-drafting is a model call per message. A flood of mail to the receiving
 *  address must not turn into a flood of model calls: past this many people's
 *  replies in an hour, new ones still arrive but wait for a click. */
export const MAX_AUTO_DRAFTS_PER_HOUR = 20

export type InboundResult =
  | { handled: false; why: 'not-an-inbound-event' | 'own-mail' | 'unreadable' | 'duplicate' }
  | { handled: true; outcome: IngestOutcome; messageId: string | null }

/**
 * Step 1 — runs inside the webhook request. Fetch the mail, store it, apply
 * the mechanical rules (suppress an opt-out, hold on an auto-reply, mark a
 * university replied). If this throws, the webhook answers 5xx and Resend
 * retries: losing a reply is the failure that matters.
 */
export async function receiveInbound(
  db: Db,
  event: unknown,
  { fetchEmail, now = new Date() }: { fetchEmail: (id: string) => Promise<ReceivedEmail>; now?: Date },
): Promise<InboundResult> {
  const id = receivedEmailId(event)
  if (!id) return { handled: false, why: 'not-an-inbound-event' }
  const mail = await fetchEmail(id)
  const input = toInbound(mail)
  if (!input) return { handled: false, why: 'unreadable' }
  if (isOwnMail(input.from)) return { handled: false, why: 'own-mail' }

  const [outcome] = await ingestMessages(db, [input], { now })
  if (outcome.duplicate) return { handled: false, why: 'duplicate' }
  const { data } = await db.from('university_messages').select('id').eq('source', 'resend_inbound').eq('external_id', id).limit(1)
  return { handled: true, outcome, messageId: (data as { id: string }[] | null)?.[0]?.id ?? null }
}

export interface AfterDeps {
  drafter: (i: DrafterInput) => Promise<DraftOutput>
  notify: (to: string, subject: string, text: string) => Promise<void>
  dashboardUrl: string
  now?: Date
}

/**
 * Step 2 — runs after the webhook has answered. Prepare an answer for a
 * person's reply and tell the operator. Best effort: a failure here (the model
 * is down, the notice bounced) must not lose or undo the stored message, so
 * errors are collected and returned, never thrown.
 */
export async function afterInbound(db: Db, r: Extract<InboundResult, { handled: true }>, deps: AfterDeps): Promise<{ drafted: boolean; notified: boolean; errors: string[] }> {
  const errors: string[] = []
  const kind = r.outcome.kind
  if ((kind !== 'human_reply' && kind !== 'opt_out') || !r.messageId) return { drafted: false, notified: false, errors }

  let drafted = false
  if (kind === 'human_reply' && r.outcome.university) {
    const since = new Date((deps.now ?? new Date()).getTime() - 3600_000).toISOString()
    const { data } = await db.from('university_messages').select('id').eq('kind', 'human_reply').gte('received_at', since)
    if ((data?.length ?? 0) <= MAX_AUTO_DRAFTS_PER_HOUR) {
      try {
        await draftReplyFor(db, r.messageId, deps.drafter)
        drafted = true
      } catch (e) {
        errors.push(`draft: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  let notified = false
  const to = notifyTarget(await loadSettings(db))
  if (to) {
    try {
      const { data: m } = await db.from('university_messages').select('subject, body_text, from_email').eq('id', r.messageId).maybeSingle()
      const row = m as { subject: string | null; body_text: string | null; from_email: string } | null
      const notice = buildNotice({
        kind,
        university: r.outcome.university ?? null,
        fromEmail: row?.from_email ?? '',
        subject: row?.subject ?? null,
        preview: row?.body_text ?? '',
        drafted,
        dashboardUrl: deps.dashboardUrl,
      })
      await deps.notify(to, notice.subject, notice.text)
      notified = true
    } catch (e) {
      errors.push(`notify: ${e instanceof Error ? e.message : String(e)}`)
    }
  } else {
    errors.push('notify: no notification address (set "Notify me at")')
  }
  return { drafted, notified, errors }
}
