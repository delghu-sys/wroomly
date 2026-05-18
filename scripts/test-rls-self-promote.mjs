// Self-promotion attack test.
//
// Creates a throwaway non-admin user via service-role, signs in as them
// with the anon key to get a real user JWT, then attempts to PATCH their
// own user_type to 'admin' the way a malicious user would in the browser
// console. With migration 007 applied, the policy's `with check` clause
// should silently reject the write.
//
// Cleans up the test user at the end either way.
//
// Run with:  node --env-file=.env.local scripts/test-rls-self-promote.mjs

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC       = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPA_URL || !ANON || !SVC) {
  console.error('Missing env. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const stamp = Date.now()
const email    = `rls-test-${stamp}@umich.edu`
const password = `rls-test-pw-${stamp}-x`

const c = {
  red:   s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow:s => `\x1b[33m${s}\x1b[0m`,
  dim:   s => `\x1b[2m${s}\x1b[0m`,
}

async function admin(path, init = {}) {
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

let userId = null

try {
  console.log(c.dim(`→ creating throwaway user ${email}`))
  const createRes = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,        // skip confirmation email
      user_metadata: { user_type: 'consumer' },
    }),
  })
  const created = await createRes.json()
  if (!createRes.ok) throw new Error(`createUser failed: ${JSON.stringify(created)}`)
  userId = created.id
  console.log(c.dim(`  uid=${userId}`))

  // Seed the public.users row so RLS has something to update. The app's
  // callback route normally does this on first login, but our test signs in
  // via the auth API directly.
  console.log(c.dim('→ seeding public.users row as a consumer'))
  const insertRes = await admin('/rest/v1/users', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      id: userId,
      email,
      full_name: 'RLS Test User',
      user_type: 'consumer',
      is_verified: false,
      is_suspended: false,
    }),
  })
  const insertBody = await insertRes.json()
  if (!insertRes.ok) throw new Error(`seed users row failed: ${JSON.stringify(insertBody)}`)

  // Sign in as the throwaway user to get a real JWT.
  console.log(c.dim('→ signing in as throwaway user'))
  const signinRes = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const signin = await signinRes.json()
  if (!signinRes.ok) throw new Error(`signin failed: ${JSON.stringify(signin)}`)
  const token = signin.access_token

  // ── The attack ───────────────────────────────────────────────────
  console.log('')
  console.log(c.yellow('▸ Attack 1: PATCH user_type → "admin"'))
  const attackRes = await fetch(`${SUPA_URL}/rest/v1/users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ user_type: 'admin' }),
  })
  const attackBody = await attackRes.json()
  console.log(`  status=${attackRes.status}  body=${JSON.stringify(attackBody)}`)

  // Verify with service-role read what user_type actually is now.
  const verifyRes = await admin(`/rest/v1/users?id=eq.${userId}&select=user_type,is_verified`)
  const verifyBody = await verifyRes.json()
  console.log(`  actual row in DB (service-role read): ${JSON.stringify(verifyBody)}`)

  const stillConsumer = verifyBody[0]?.user_type === 'consumer'
  if (stillConsumer) {
    console.log(c.green('  ✅ blocked — user_type unchanged'))
  } else {
    console.log(c.red(`  🚨 PROMOTION SUCCEEDED — user_type is now '${verifyBody[0]?.user_type}'`))
  }

  // ── Attack 2: try is_verified ────────────────────────────────────
  console.log('')
  console.log(c.yellow('▸ Attack 2: PATCH is_verified → true'))
  const a2 = await fetch(`${SUPA_URL}/rest/v1/users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ is_verified: true }),
  })
  const a2body = await a2.json()
  console.log(`  status=${a2.status}  body=${JSON.stringify(a2body)}`)
  const v2 = await admin(`/rest/v1/users?id=eq.${userId}&select=is_verified`)
  const v2body = await v2.json()
  console.log(`  actual: ${JSON.stringify(v2body)}`)
  if (v2body[0]?.is_verified === false) {
    console.log(c.green('  ✅ blocked — is_verified still false'))
  } else {
    console.log(c.red('  🚨 is_verified flipped to true'))
  }

  // ── Sanity: legit edit still works ───────────────────────────────
  console.log('')
  console.log(c.yellow('▸ Sanity: PATCH bio (a non-trust column) — should succeed'))
  const okRes = await fetch(`${SUPA_URL}/rest/v1/users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ bio: 'hello from the rls test' }),
  })
  const okBody = await okRes.json()
  console.log(`  status=${okRes.status}  body=${JSON.stringify(okBody)}`)
  if (Array.isArray(okBody) && okBody[0]?.bio === 'hello from the rls test') {
    console.log(c.green('  ✅ legit edit went through'))
  } else {
    console.log(c.red('  ⚠️  legit edit also blocked — policy may be too tight'))
  }

} catch (err) {
  console.error(c.red('test errored:'), err)
} finally {
  if (userId) {
    console.log(c.dim(`\n→ cleanup: deleting throwaway user ${userId}`))
    // delete public.users row first (FK), then auth.users
    await admin(`/rest/v1/users?id=eq.${userId}`, { method: 'DELETE' })
    await admin(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' })
    console.log(c.dim('  done'))
  }
}
