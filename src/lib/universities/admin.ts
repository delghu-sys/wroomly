import { createClient } from '@/lib/supabase/server'

/** The signed-in admin, or null. Re-verified server-side on every call; the
 *  browser carries no trust. */
export async function requireAdmin(): Promise<{ id: string; email: string | null } | null> {
  const authed = await createClient()
  const {
    data: { user },
  } = await authed.auth.getUser()
  if (!user) return null
  const { data: requester } = await authed.from('users').select('user_type, is_suspended').eq('id', user.id).single()
  if (requester?.is_suspended || requester?.user_type !== 'admin') return null
  return { id: user.id, email: user.email ?? null }
}

export const outreachEnabled = () => process.env.UNIVERSITY_OUTREACH_ENABLED === 'true'
