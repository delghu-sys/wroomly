import { test, expect } from '@playwright/test'

/**
 * The outreach opt-out must work for a logged-out stranger.
 *
 * This is a regression test for a real bug: /api/outreach/unsubscribe was not
 * listed as public in middleware.ts, so every click on it 307'd to /sign-in.
 * The people it exists for have no Wroomly account and never will — and since
 * the unsubscribe link was removed from the email body, the List-Unsubscribe
 * header pointing here is the ONLY opt-out left in an outreach email. A
 * redirect to a sign-in wall makes opting out impossible.
 *
 * Deliberately uses an RFC 2606 `.invalid` address, which can never belong to
 * a real person, and never asserts on a valid-token success (that would write
 * to the shared suppressions table).
 */

const UNSUB = '/api/outreach/unsubscribe'
const NOBODY = 'probe@example.invalid'

test('is reachable without a session — never redirects to sign-in', async ({ request }) => {
  const res = await request.get(`${UNSUB}?email=${encodeURIComponent(NOBODY)}&t=not-a-real-token`, {
    maxRedirects: 0,
  })

  expect(res.status(), 'a redirect here means nobody can opt out').not.toBe(307)
  expect(res.status()).not.toBe(302)
  expect(res.headers()['location'] ?? '').not.toContain('/sign-in')
})

test('rejects a forged token instead of suppressing the address', async ({ request }) => {
  const res = await request.get(`${UNSUB}?email=${encodeURIComponent(NOBODY)}&t=forged`)
  expect(res.status()).toBe(400)
  expect(await res.text()).toContain('didn’t work')
})

test('a missing token is refused, so the URL alone cannot opt someone out', async ({ request }) => {
  const res = await request.get(`${UNSUB}?email=${encodeURIComponent(NOBODY)}`)
  expect(res.status()).toBe(400)
})
