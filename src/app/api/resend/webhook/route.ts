import { NextResponse, after } from 'next/server'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { resend, FROM_EMAIL, verifyResendWebhook } from '@/lib/resend'
import { planSuppression } from '@/lib/agents/resend-events'
import { afterInbound, receiveInbound } from '@/lib/universities/inbound-runner'
import { draftWithClaude } from '@/lib/universities/reply-drafter'
import type { ReceivedEmail } from '@/lib/universities/inbound'

/**
 * POST /api/resend/webhook — Resend delivery events.
 *
 * Wires hard bounces and spam complaints into `outreach_suppressions`, which
 * is the table every outreach send checks. Until this existed, the table only
 * ever grew from someone clicking unsubscribe: a person who marked us as spam
 * stayed on the list and could be mailed again.
 *
 * Signature verification is mandatory and comes first. Without it, anyone who
 * learned this URL could POST a forged "bounce" and quietly suppress an
 * address, which is a silent way to make outreach stop working.
 *
 * Always returns 200 for an authentic event, even one we ignore: a non-2xx
 * makes Resend retry, and retrying an event we deliberately skipped is noise.
 * A bad signature is the one case that gets a 4xx.
 *
 * It also receives `email.received`: a reply to one of our emails, delivered to
 * the receiving subdomain. That is stored and read here (a failure returns 5xx
 * so Resend retries), and the slow part — preparing an answer, telling the
 * operator — runs after the response. Nothing is ever SENT from this route.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function fetchReceived(id: string): Promise<ReceivedEmail> {
  const { data, error } = await resend.emails.receiving.get(id)
  if (error || !data) throw new Error(error?.message ?? 'Could not fetch the received email')
  return {
    id: data.id,
    from: data.from,
    to: data.to,
    subject: data.subject,
    created_at: data.created_at,
    message_id: data.message_id,
    text: data.text,
    html: data.html,
    headers: data.headers,
  }
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[resend/webhook] RESEND_WEBHOOK_SECRET is not set — rejecting')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Raw text, not request.json(): the signature is computed over the exact
  // bytes sent, so re-serializing parsed JSON would never match.
  const payload = await request.text()
  const h = await headers()
  const id = h.get('svix-id')
  const timestamp = h.get('svix-timestamp')
  const signature = h.get('svix-signature')

  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 })
  }

  let event: unknown
  try {
    event = verifyResendWebhook({ payload, headers: { id, timestamp, signature }, secret })
  } catch (err) {
    // Wrong secret, tampered body, or a replayed timestamp outside tolerance.
    console.warn('[resend/webhook] signature rejected:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = createServiceClient()

  // Replay guard, sharing the table the Stripe webhook already uses. Svix ids
  // are `msg_…`, Stripe's are `evt_…`, so they cannot collide.
  const { error: dedupeErr } = await db
    .from('webhook_events')
    .insert({ id, type: String((event as { type?: unknown })?.type ?? 'unknown') })
  if (dedupeErr) {
    if ('code' in dedupeErr && dedupeErr.code === '23505') {
      return NextResponse.json({ received: true, replay: true })
    }
    // Don't drop a real bounce because the dedupe table is unreachable; at
    // worst the suppression upsert below runs twice, which is idempotent.
    console.error('[resend/webhook] dedupe insert failed:', dedupeErr.message)
  }

  // A reply from a university. Handled before the suppression logic: it is
  // not a delivery event.
  if ((event as { type?: unknown })?.type === 'email.received') {
    try {
      const r = await receiveInbound(db, event, { fetchEmail: fetchReceived })
      if (r.handled) {
        const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'
        after(async () => {
          const res = await afterInbound(db, r, {
            drafter: i => draftWithClaude(i),
            notify: async (to, subject, text) => {
              const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, text })
              if (error) throw new Error(error.message)
            },
            dashboardUrl: `${base}/admin/universities`,
          })
          if (res.errors.length) console.warn('[resend/webhook] inbound follow-up:', res.errors.join('; '))
        })
      }
      return NextResponse.json({ received: true, inbound: r.handled ? 'stored' : r.why })
    } catch (err) {
      // Undo the replay mark: otherwise Resend's retry of THIS event would be
      // dismissed as a repeat and the reply lost for good.
      await db.from('webhook_events').delete().eq('id', id)
      console.error('[resend/webhook] inbound failed:', err instanceof Error ? err.message : err)
      return NextResponse.json({ error: 'Could not store the reply' }, { status: 500 })
    }
  }

  const plan = planSuppression(event)
  if (!plan) return NextResponse.json({ received: true, suppressed: 0 })

  // ignoreDuplicates: an address already on the list stays with the reason it
  // arrived with. Someone who unsubscribed and later bounces is still just
  // suppressed — overwriting would lose the fact that they asked to leave.
  const { error: supErr } = await db
    .from('outreach_suppressions')
    .upsert(
      plan.emails.map(email => ({ email, reason: plan.reason })),
      { onConflict: 'email', ignoreDuplicates: true },
    )
  if (supErr) {
    // 5xx so Resend retries — losing a complaint is the one failure that
    // actually matters here.
    console.error('[resend/webhook] suppression write failed:', supErr.message)
    return NextResponse.json({ error: 'Could not record suppression' }, { status: 500 })
  }

  // Take any still-queued lead for that address out of the send plan too, so
  // it cannot be picked up again before the suppression check runs.
  const { error: leadErr } = await db
    .from('sourced_leads')
    .update({ status: 'skipped', skip_reason: plan.reason })
    .in('contact_email', plan.emails)
    .in('status', ['new', 'drafted'])
  if (leadErr) console.warn('[resend/webhook] lead cleanup failed:', leadErr.message)

  console.info(`[resend/webhook] ${plan.reason}: suppressed ${plan.emails.length} address(es)`)
  return NextResponse.json({ received: true, suppressed: plan.emails.length })
}
