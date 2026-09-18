import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { runDiscover, runDraft, runOutreach, SOURCES } from '@/lib/agents/runner'

/**
 * POST /api/admin/agents — run one growth agent from the admin console.
 *
 * Body: { action: 'discover' | 'draft' | 'outreach', execute?: boolean,
 *         sources?: string[] }
 *
 * Same trust model as /api/admin/actions: the requester is re-verified as an
 * admin through the RLS-bound session client, and only then does the service
 * role do the work. `execute: false` (the default) is a dry run — the console
 * uses it for "Preview". Outreach additionally needs OUTREACH_ENABLED=true in
 * the environment; that check lives in the runner so the console and the CLI
 * cannot disagree about it.
 */

// Discovery fetches an external site and drafting/outreach loop over rows;
// give the function room beyond the default.
export const maxDuration = 60

const bodySchema = z.object({
  action: z.enum(['discover', 'draft', 'outreach']),
  execute: z.boolean().default(false),
  sources: z.array(z.string()).optional(),
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

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const db = createServiceClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'

  try {
    if (body.action === 'discover') {
      const known = SOURCES.map(s => s.key)
      const sourceKeys = (body.sources ?? []).filter(k => known.includes(k))
      const result = await runDiscover(db, { sourceKeys, execute: body.execute })
      return NextResponse.json(result)
    }

    if (body.action === 'draft') {
      const result = await runDraft(db, { execute: body.execute })
      return NextResponse.json(result)
    }

    const result = await runOutreach(db, {
      execute: body.execute,
      origin,
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
    console.error('[admin/agents]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent run failed' },
      { status: 500 },
    )
  }
}
