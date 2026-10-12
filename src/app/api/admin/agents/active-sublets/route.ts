import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { refreshActiveSublets } from '@/lib/agents/runner'

/**
 * POST /api/admin/agents/active-sublets — re-check the board and return fresh
 * counts for the "Active sublets" card on /admin/agents.
 *
 * Reads ~15 listing pages from the board (only ones that could still be
 * active), so it needs room beyond the default function timeout. It sends
 * nothing and publishes nothing; the only writes are availability stamps on
 * leads that already exist.
 *
 * Same trust model as the other admin agent routes: the requester is
 * re-verified as an admin through the RLS-bound session client before the
 * service role does any work.
 */

export const maxDuration = 60

export async function POST() {
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

  try {
    return NextResponse.json(await refreshActiveSublets(createServiceClient()))
  } catch (err) {
    console.error('[admin/agents/active-sublets]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not check the board' },
      { status: 500 },
    )
  }
}
