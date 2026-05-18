/**
 * Service-role helpers for seeding/destroying test users.
 *
 * Each test that needs a real signed-in session calls `createTestUser()` in
 * its `test.beforeEach` and `deleteTestUser()` in `test.afterEach`. We use
 * the same REST calls the RLS regression script uses — no client SDK
 * dependency in tests.
 */

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPA_URL || !SVC) {
  // Surfaced at module-load time so a misconfigured env fails loudly rather
  // than producing a confusing "auth/no-such-user" later.
  throw new Error(
    'tests need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local',
  )
}

interface TestUser {
  id: string
  email: string
  password: string
  user_type: 'consumer' | 'supplier' | 'admin'
}

async function admin(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPA_URL}${path}`, {
    ...init,
    headers: {
      apikey: SVC,
      Authorization: `Bearer ${SVC}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
}

export async function createTestUser(
  opts: { user_type?: 'consumer' | 'supplier' | 'admin'; full_name?: string } = {},
): Promise<TestUser> {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  const email = `pwtest-${stamp}@umich.edu`
  const password = `pwtest-pw-${stamp}`
  const user_type = opts.user_type ?? 'consumer'

  // 1. auth.users via admin API
  const authRes = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const authBody = await authRes.json()
  if (!authRes.ok) {
    throw new Error(`createTestUser auth failed: ${JSON.stringify(authBody)}`)
  }
  const id = authBody.id as string

  // 2. public.users row (the app's callback would normally do this on
  //    first login — we're skipping the UI path)
  const usersRes = await admin('/rest/v1/users', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      id,
      email,
      full_name: opts.full_name ?? 'Playwright User',
      user_type,
      is_verified: false,
      is_suspended: false,
    }),
  })
  if (!usersRes.ok) {
    const body = await usersRes.json()
    throw new Error(`createTestUser users insert failed: ${JSON.stringify(body)}`)
  }

  return { id, email, password, user_type }
}

export async function deleteTestUser(user: TestUser): Promise<void> {
  // Order matters: public.users has FK from inquiries / conversations /
  // listings → cascading is configured in 001 so a single delete is enough,
  // but auth.users delete fails if public.users row still exists in some
  // configs. Belt-and-suspenders cleanup:
  await admin(`/rest/v1/users?id=eq.${user.id}`, { method: 'DELETE' })
  await admin(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' })
}

/**
 * Programmatic sign-in: posts to Supabase /auth/v1/token, returns the
 * access_token + user id. Used by the page-context helper to inject a
 * session into localStorage without driving the sign-in form UI.
 */
export async function signInAsTestUser(
  user: TestUser,
): Promise<{ access_token: string; refresh_token: string; expires_at: number }> {
  const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: user.email, password: user.password }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`signIn failed: ${JSON.stringify(body)}`)
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: body.expires_at,
  }
}

export type { TestUser }
