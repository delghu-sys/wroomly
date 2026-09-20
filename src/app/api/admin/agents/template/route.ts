import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_TEMPLATE } from '@/lib/agents/outreach-template'

/**
 * GET/POST /api/admin/agents/template — the one editable outreach email.
 *
 * GET returns the saved row, or DEFAULT_TEMPLATE if nothing has been saved
 * yet (matches loadOutreachTemplate's own fallback, so the editor always
 * opens showing what a send would actually use).
 *
 * POST upserts it. What is saved here IS the whole email: the unsubscribe
 * line and postal address that used to be appended in code were removed on
 * 2026-09-20 at Hugo's request — see the note atop outreach-template.ts.
 */

async function requireAdmin() {
  const authed = await createClient()
  const {
    data: { user },
  } = await authed.auth.getUser()
  if (!user) return null

  const { data: requester } = await authed
    .from('users')
    .select('user_type, is_suspended')
    .eq('id', user.id)
    .single()
  if (requester?.is_suspended || requester?.user_type !== 'admin') return null
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data } = await service
    .from('outreach_template')
    .select('subject, body')
    .eq('id', 'default')
    .maybeSingle()

  return NextResponse.json(data ?? DEFAULT_TEMPLATE)
}

const bodySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000),
})

export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('outreach_template')
    .upsert({ id: 'default', subject: parsed.subject, body: parsed.body })

  if (error) {
    console.error('[admin/agents/template] save failed', error)
    return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
