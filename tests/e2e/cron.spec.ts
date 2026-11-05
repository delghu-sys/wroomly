import { test, expect } from '@playwright/test'

/**
 * Vercel Cron calls carry no session cookie. They must reach the route (which
 * checks the bearer secret itself), not be redirected to /sign-in by the auth
 * gate in middleware. A 307 here means the alert jobs silently never run.
 */
for (const path of ['/api/cron/saved-search-alerts', '/api/cron/match-alerts']) {
  test(`${path} reaches its own auth check, not the sign-in redirect`, async ({ request }) => {
    const res = await request.get(path, { maxRedirects: 0 })
    expect(res.status()).toBe(401)
  })

  test(`${path} rejects a wrong secret`, async ({ request }) => {
    const res = await request.get(path, {
      maxRedirects: 0,
      headers: { authorization: 'Bearer definitely-not-the-secret' },
    })
    expect(res.status()).toBe(401)
  })
}
