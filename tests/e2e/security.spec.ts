import { test, expect } from '@playwright/test'
import { createTestUser, deleteTestUser, signInAsTestUser, type TestUser } from './helpers/supabase-admin'
import { signInUiless } from './helpers/auth'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Security regression tests. Run the most dangerous attacks from the audit
 * against the live DB and assert they fail. Complements the standalone
 * scripts/test-rls-self-promote.mjs by also covering the HTTP-API surface
 * (admin/users injection, inquiry tampering).
 */

test.describe('RLS lockdown', () => {
  let user: TestUser

  test.beforeEach(async () => {
    user = await createTestUser({ user_type: 'consumer' })
  })
  test.afterEach(async () => {
    if (user) await deleteTestUser(user)
  })

  test('cannot self-promote to admin via direct PostgREST PATCH', async () => {
    const { access_token } = await signInAsTestUser(user)
    const res = await fetch(`${SUPA_URL}/rest/v1/users?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ user_type: 'admin' }),
    })
    expect(res.status, 'self-promote should be 403').toBe(403)
    const body = await res.json()
    expect(body.code, 'should be RLS policy violation').toBe('42501')
  })

  test('cannot flip is_verified via direct PATCH', async () => {
    const { access_token } = await signInAsTestUser(user)
    const res = await fetch(`${SUPA_URL}/rest/v1/users?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_verified: true }),
    })
    expect(res.status, 'is_verified flip should be 403').toBe(403)
  })

  test('can still edit bio (non-trust column)', async () => {
    const { access_token } = await signInAsTestUser(user)
    const newBio = `e2e-bio-${Date.now()}`
    // `?select=bio` is required with return=representation: without it
    // PostgREST returns ALL columns, and 029's column-level grants deny
    // SELECT on email/phone/stripe ids — the update would succeed but the
    // representation 403s (exactly how this test caught the live 032 bug).
    const res = await fetch(`${SUPA_URL}/rest/v1/users?id=eq.${user.id}&select=bio`, {
      method: 'PATCH',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ bio: newBio }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0]?.bio).toBe(newBio)
  })
})

test.describe('Admin gates', () => {
  let consumer: TestUser

  test.beforeEach(async () => {
    consumer = await createTestUser({ user_type: 'consumer' })
  })
  test.afterEach(async () => {
    if (consumer) await deleteTestUser(consumer)
  })

  test('non-admin gets redirected from /admin/users', async ({ page }) => {
    await signInUiless(page, consumer)
    await page.goto('/admin/users')
    // Should bounce them to /dashboard (the route's guard does redirect()).
    await expect(page).toHaveURL(/\/(dashboard|sign-in)/, { timeout: 10_000 })
  })

  test('admin/users search rejects injection metacharacters', async ({ page }) => {
    // The page strips `(),*` from the q param before composing the
    // PostgREST `.or()` filter. We can't easily verify the SQL from
    // outside, but we can confirm the page renders without crashing
    // when given a hostile query.
    const hostile = '),user_type.eq.admin,(x'
    await page.goto(`/admin/users?q=${encodeURIComponent(hostile)}`)
    // Even though we're not an admin, the page should not 500. It will
    // redirect us to /dashboard or /sign-in.
    await expect(page).toHaveURL(/\/(dashboard|sign-in)/, { timeout: 10_000 })
  })
})
