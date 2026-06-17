import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Who gets the "import needs review" email. Prefers an explicit ADMIN_EMAIL
 * env (comma-separated allowed); otherwise emails every admin account's
 * address. Returns [] if none resolvable (caller logs + degrades).
 */
export async function getAdminEmails(): Promise<string[]> {
  const fromEnv = process.env.ADMIN_EMAIL
  if (fromEnv) {
    return fromEnv
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)
  }

  const service = createServiceClient()
  const { data } = await service
    .from('users')
    .select('email')
    .eq('user_type', 'admin')

  return ((data ?? []) as { email: string | null }[])
    .map(u => u.email)
    .filter((e): e is string => !!e)
}
