import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import { requireAdmin, outreachEnabled } from '@/lib/universities/admin'
import { approveAll, draftAll, sendApproved, testTemplate, unapproveMany } from '@/lib/universities/runner'

/**
 * POST /api/admin/universities
 *   { action: 'draft-all', redraft?: boolean }   fill drafts from the template
 *   { action: 'approve-all', confirm: true }     approve every drafted message
 *   { action: 'approve-selected', ids }           approve only these
 *   { action: 'withdraw-selected', ids }          withdraw approval of only these
 *   { action: 'test-template' }                  mail the template to YOUR address
 *   { action: 'send-approved', confirm: true }   send every approved message
 *
 * Both are admin-only. Sending also needs UNIVERSITY_OUTREACH_ENABLED=true and
 * goes through checkSend for every message, so approval, edits-since-approval,
 * opt-outs and the daily cap are enforced per message, not per click.
 */
export const maxDuration = 60

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('draft-all'), redraft: z.boolean().optional() }),
  z.object({ action: z.literal('approve-all'), confirm: z.literal(true) }),
  z.object({ action: z.literal('approve-selected'), ids: z.array(z.string().uuid()).min(1).max(500) }),
  z.object({ action: z.literal('withdraw-selected'), ids: z.array(z.string().uuid()).min(1).max(500) }),
  z.object({ action: z.literal('test-template') }),
  z.object({ action: z.literal('send-approved'), confirm: z.literal(true) }),
])

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
    if (body.action === 'draft-all') return NextResponse.json(await draftAll(db, { redraft: body.redraft }))
    if (body.action === 'approve-all') return NextResponse.json(await approveAll(db))
    if (body.action === 'approve-selected') return NextResponse.json(await approveAll(db, body.ids))
    if (body.action === 'withdraw-selected') return NextResponse.json({ withdrawn: await unapproveMany(db, body.ids) })

    const send = async (m: { from: string; to: string; replyTo: string; subject: string; text: string }) => {
      const { data, error } = await resend.emails.send({ from: m.from, to: m.to, replyTo: m.replyTo, subject: m.subject, text: m.text })
      if (error) throw new Error(error.message)
      return { id: data?.id }
    }
    if (body.action === 'test-template') {
      // The recipient is the signed-in admin's own address — never a request field.
      if (!admin.email) return NextResponse.json({ error: 'Your account has no email address.' }, { status: 400 })
      const r = await testTemplate(db, { to: admin.email, send })
      return NextResponse.json({ ok: true, sentTo: r.envelope.to, from: r.envelope.from, replyTo: r.envelope.replyTo, university: r.university })
    }
    return NextResponse.json(await sendApproved(db, { enabled: outreachEnabled(), send }))
  } catch (err) {
    console.error('[admin/universities]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 })
  }
}
