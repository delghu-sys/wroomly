import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { runTestSend } from '@/lib/agents/runner'

/**
 * POST /api/admin/agents/test-send — mail yourself the exact outreach email
 * the next real send would produce, so it can be checked in a real inbox
 * before a stranger ever receives one.
 *
 * The recipient is ALWAYS the signed-in admin's own address, read from the
 * session — deliberately not a field in the request body. There is therefore
 * no input to this endpoint that can aim an email at another person, and no
 * need for the OUTREACH_ENABLED gate that protects strangers: this route
 * cannot reach one. runTestSend additionally refuses any address belonging to
 * a lead, any suppressed address, and any claim link that would not resolve.
 *
 * The lead is left untouched — still `drafted`, token intact — so a test
 * never costs a real lead.
 */

export const maxDuration = 30

const bodySchema = z.object({
  execute: z.boolean().default(false),
  leadId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const authed = await createClient()
  const {
    data: { user },
  } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: requester } = await authed
    .from('users')
    .select('user_type, is_suspended')
    .eq('id', user.id)
    .single()
  if (requester?.is_suspended || requester?.user_type !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!user.email) {
    return NextResponse.json({ error: 'Your account has no email address.' }, { status: 400 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const result = await runTestSend(createServiceClient(), {
      to: user.email,
      execute: body.execute,
      leadId: body.leadId,
      origin: process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app',
      send: async ({ to, subject, text, listUnsubscribe }) => {
        const { error } = await resend.emails.send({
          from: FROM_EMAIL,
          to,
          subject,
          text,
          headers: { 'List-Unsubscribe': `<${listUnsubscribe}>` },
        })
        if (error) throw new Error(error.message)
      },
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[admin/agents/test-send]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Test send failed' },
      { status: 500 },
    )
  }
}
