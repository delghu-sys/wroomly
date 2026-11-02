import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import { requireAdmin, outreachEnabled } from '@/lib/universities/admin'
import { draftWithClaude } from '@/lib/universities/reply-drafter'
import {
  approveReply,
  draftReplyFor,
  loadInbox,
  markMessage,
  saveReply,
  sendReply,
  testReply,
  withdrawReply,
  type ReplyMailer,
} from '@/lib/universities/replies-runner'

/**
 * POST /api/admin/universities/inbox — the replies inbox.
 *
 *   draft / draft-all   ask the assistant to read a reply and prepare an answer
 *   save                edit the prepared answer (voids its approval)
 *   approve / withdraw  approve THE EXACT text, or take the approval back
 *   test                mail the answer to YOUR OWN address
 *   send                send one approved answer (threaded under their email)
 *   mark                handled / ignored / back to new
 *
 * Admin-only. Nothing here sends without approval: sendReply re-checks the
 * approval hash, opt-outs, the sender setup and UNIVERSITY_OUTREACH_ENABLED.
 * Reading and classifying incoming mail happens elsewhere (ingest), by plain
 * rules — never by this route, and never by a model.
 */
export const maxDuration = 60

const id = z.string().uuid()
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('draft'), id }),
  z.object({ action: z.literal('draft-all') }),
  z.object({ action: z.literal('save'), id, subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(6000) }),
  z.object({ action: z.literal('approve'), id }),
  z.object({ action: z.literal('withdraw'), id }),
  z.object({ action: z.literal('test'), id }),
  z.object({ action: z.literal('send'), id, confirm: z.literal(true) }),
  z.object({ action: z.literal('mark'), id, status: z.enum(['handled', 'ignored', 'new']) }),
])

const mailer: ReplyMailer = async m => {
  const { data, error } = await resend.emails.send({ from: m.from, to: m.to, replyTo: m.replyTo, subject: m.subject, text: m.text, ...(m.headers ? { headers: m.headers } : {}) })
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
        await draftReplyFor(db, body.id, i => draftWithClaude(i))
        return NextResponse.json({ ok: true })
      case 'draft-all': {
        // A handful per click: each draft is a model call, and the request is cut off at 60s.
        const { needsYou } = await loadInbox(db)
        const todo = needsYou.filter(m => m.kind === 'human_reply' && m.status === 'new').slice(0, 5)
        let drafted = 0
        for (const m of todo) {
          await draftReplyFor(db, m.id, i => draftWithClaude(i))
          drafted++
        }
        return NextResponse.json({ drafted, remaining: needsYou.filter(m => m.kind === 'human_reply' && m.status === 'new').length - drafted })
      }
      case 'save':
        await saveReply(db, body.id, { subject: body.subject, body: body.body })
        return NextResponse.json({ ok: true })
      case 'approve':
        await approveReply(db, body.id)
        return NextResponse.json({ ok: true })
      case 'withdraw':
        await withdrawReply(db, body.id)
        return NextResponse.json({ ok: true })
      case 'test': {
        // The recipient is the signed-in admin's own address — never a request field.
        if (!admin.email) return NextResponse.json({ error: 'Your account has no email address.' }, { status: 400 })
        const e = await testReply(db, body.id, { to: admin.email, send: mailer })
        return NextResponse.json({ ok: true, sentTo: e.to, from: e.from, replyTo: e.replyTo })
      }
      case 'send': {
        const o = await sendReply(db, body.id, { send: mailer, enabled: outreachEnabled() })
        return NextResponse.json(o, { status: o.sent ? 200 : 409 })
      }
      case 'mark':
        await markMessage(db, body.id, body.status)
        return NextResponse.json({ ok: true })
    }
  } catch (err) {
    console.error('[admin/universities/inbox]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 })
  }
}
