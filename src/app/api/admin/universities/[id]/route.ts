import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import { requireAdmin, outreachEnabled } from '@/lib/universities/admin'
import { approve, markOutcome, saveDraft, sendOne, testSend, unapprove, type MailSender } from '@/lib/universities/runner'

/**
 * POST /api/admin/universities/[id] — one university.
 *
 * `test` mails the draft to the SIGNED-IN admin's own address (read from the
 * session, never from the request), so no input can aim it at anyone else.
 * `send` is the only call that mails the university, and only after
 * checkSend has re-verified approval, the sender, opt-outs and the cap.
 */
export const maxDuration = 30

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('save'),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(6000),
    contact_email: z.string().trim().email().nullable().optional(),
  }),
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('unapprove') }),
  z.object({ action: z.literal('test') }),
  z.object({ action: z.literal('send'), confirm: z.literal(true) }),
  z.object({
    action: z.literal('outcome'),
    outcome: z.enum(['replied', 'declined', 'skipped', 'researched']),
    note: z.string().max(1000).optional(),
  }),
])

const mailer: MailSender = async m => {
  const { data, error } = await resend.emails.send({ from: m.from, to: m.to, replyTo: m.replyTo, subject: m.subject, text: m.text })
  if (error) throw new Error(error.message)
  return { id: data?.id }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const db = createServiceClient()
  try {
    switch (body.action) {
      case 'save':
        await saveDraft(db, id, { subject: body.subject, body: body.body, contact_email: body.contact_email })
        return NextResponse.json({ ok: true })
      case 'approve':
        await approve(db, id)
        return NextResponse.json({ ok: true })
      case 'unapprove':
        await unapprove(db, id)
        return NextResponse.json({ ok: true })
      case 'test': {
        if (!admin.email) return NextResponse.json({ error: 'Your account has no email address.' }, { status: 400 })
        const sent = await testSend(db, id, { to: admin.email, send: mailer })
        return NextResponse.json({ ok: true, sentTo: sent.to, from: sent.from, replyTo: sent.replyTo })
      }
      case 'send': {
        const outcome = await sendOne(db, id, { send: mailer, enabled: outreachEnabled() })
        return NextResponse.json(outcome, { status: outcome.sent ? 200 : 409 })
      }
      case 'outcome':
        await markOutcome(db, id, body.outcome, body.note)
        return NextResponse.json({ ok: true })
    }
  } catch (err) {
    console.error('[admin/universities/[id]]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 })
  }
}
