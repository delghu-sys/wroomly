import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { addManualMessage, prepareClaimLink, setManualState } from '@/lib/agents/manual-runner'
import { redactClaimLinks } from '@/lib/agents/manual-outreach'

/**
 * POST /api/admin/agents/manual: the dashboard side of messages sent by hand
 * on another site's messenger. Nothing here sends anything anywhere; it records
 * what a person sent or received, and makes the draft + claim link to paste.
 *
 *   { action: 'claim-link', id }                  a fresh 7-day link to this lead's draft
 *   { action: 'log-reply', id, text }             what they wrote back
 *   { action: 'log-sent', id, text, kind }        what you sent (follow-up, claim, reply)
 *   { action: 'set-state', id, state }            listed / declined / closed / waiting
 *
 * Admin only, re-verified through the RLS-bound session like /api/admin/agents.
 */
export const maxDuration = 30

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('claim-link'), id: z.string().uuid() }),
  z.object({ action: z.literal('log-reply'), id: z.string().uuid(), text: z.string().trim().min(1).max(4000) }),
  z.object({ action: z.literal('log-sent'), id: z.string().uuid(), text: z.string().trim().min(1).max(4000), kind: z.enum(['follow-up', 'claim', 'reply']) }),
  z.object({ action: z.literal('set-state'), id: z.string().uuid(), state: z.enum(['waiting', 'replied', 'listed', 'declined', 'closed']) }),
])

export async function POST(request: Request) {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: requester } = await authed.from('users').select('user_type, is_suspended').eq('id', user.id).single()
  if (requester?.is_suspended || requester?.user_type !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const db = createServiceClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'
  try {
    if (body.action === 'claim-link') return NextResponse.json(await prepareClaimLink(db, body.id, origin))
    if (body.action === 'log-reply') {
      await addManualMessage(db, body.id, { dir: 'in', at: new Date().toISOString(), text: body.text })
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'log-sent') {
      // The claim link is a secret: never keep it in the log. The words stay.
      const text = redactClaimLinks(body.text)
      await addManualMessage(db, body.id, { dir: 'out', at: new Date().toISOString(), text, kind: body.kind })
      return NextResponse.json({ ok: true })
    }
    await setManualState(db, body.id, body.state)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/agents/manual]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 })
  }
}
