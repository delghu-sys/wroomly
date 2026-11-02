import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import { requireAdmin, outreachEnabled } from '@/lib/universities/admin'
import type { MailSender } from '@/lib/universities/runner'
import {
  approveFollowups,
  draftFollowups,
  saveFollowup,
  sendApprovedFollowups,
  sendFollowup,
  testFollowup,
  withdrawFollowups,
} from '@/lib/universities/followup-runner'

/**
 * POST /api/admin/universities/followups — the one follow-up per university.
 *
 *   draft            write the follow-up for every university that is due
 *   save             edit one follow-up (voids its approval)
 *   approve          approve all drafted follow-ups, or just `ids`
 *   withdraw         withdraw approval for `ids`
 *   test             mail one follow-up draft to YOUR OWN address
 *   send             send one approved follow-up
 *   send-approved    send every approved follow-up (cap + time budget)
 *
 * Admin-only. Every send goes through checkFollowupSend: approval (bound to the
 * exact text), the 10-day wait, no reply/decline, opt-outs, the daily cap and
 * UNIVERSITY_OUTREACH_ENABLED are all re-checked per message.
 */
export const maxDuration = 60

const ids = z.array(z.string().uuid()).min(1).max(500)
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('draft'), redraft: z.boolean().optional() }),
  z.object({ action: z.literal('save'), id: z.string().uuid(), subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(6000) }),
  z.object({ action: z.literal('approve'), ids: ids.optional() }),
  z.object({ action: z.literal('withdraw'), ids }),
  z.object({ action: z.literal('test'), id: z.string().uuid() }),
  z.object({ action: z.literal('send'), id: z.string().uuid(), confirm: z.literal(true) }),
  z.object({ action: z.literal('send-approved'), confirm: z.literal(true) }),
])

const mailer: MailSender = async m => {
  const { data, error } = await resend.emails.send({ from: m.from, to: m.to, replyTo: m.replyTo, subject: m.subject, text: m.text })
  if (error) throw new Error(error.message)
  return { id: data?.id }
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const db = createServiceClient()
  try {
    switch (body.action) {
      case 'draft':
        return NextResponse.json(await draftFollowups(db, { redraft: body.redraft }))
      case 'save':
        await saveFollowup(db, body.id, { subject: body.subject, body: body.body })
        return NextResponse.json({ ok: true })
      case 'approve':
        return NextResponse.json(await approveFollowups(db, body.ids))
      case 'withdraw':
        return NextResponse.json({ withdrawn: await withdrawFollowups(db, body.ids) })
      case 'test': {
        // The recipient is the signed-in admin's own address — never a request field.
        if (!admin.email) return NextResponse.json({ error: 'Your account has no email address.' }, { status: 400 })
        const e = await testFollowup(db, body.id, { to: admin.email, send: mailer })
        return NextResponse.json({ ok: true, sentTo: e.to, from: e.from, replyTo: e.replyTo })
      }
      case 'send': {
        const o = await sendFollowup(db, body.id, { send: mailer, enabled: outreachEnabled() })
        return NextResponse.json(o, { status: o.sent ? 200 : 409 })
      }
      case 'send-approved':
        return NextResponse.json(await sendApprovedFollowups(db, { send: mailer, enabled: outreachEnabled() }))
    }
  } catch (err) {
    console.error('[admin/universities/followups]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 })
  }
}
