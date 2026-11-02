import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import { requireAdmin, outreachEnabled } from '@/lib/universities/admin'
import { draftAll, sendApproved } from '@/lib/universities/runner'

/**
 * POST /api/admin/universities
 *   { action: 'draft-all', redraft?: boolean }   fill drafts from the template
 *   { action: 'send-approved', confirm: true }   send every approved message
 *
 * Both are admin-only. Sending also needs UNIVERSITY_OUTREACH_ENABLED=true and
 * goes through checkSend for every message, so approval, edits-since-approval,
 * opt-outs and the daily cap are enforced per message, not per click.
 */
export const maxDuration = 60

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('draft-all'), redraft: z.boolean().optional() }),
  z.object({ action: z.literal('send-approved'), confirm: z.literal(true) }),
])

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const db = createServiceClient()
  try {
    if (body.action === 'draft-all') return NextResponse.json(await draftAll(db, { redraft: body.redraft }))
    const result = await sendApproved(db, {
      enabled: outreachEnabled(),
      send: async m => {
        const { data, error } = await resend.emails.send({ from: m.from, to: m.to, replyTo: m.replyTo, subject: m.subject, text: m.text })
        if (error) throw new Error(error.message)
        return { id: data?.id }
      },
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[admin/universities]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
