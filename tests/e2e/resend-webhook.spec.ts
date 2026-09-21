import { test, expect } from '@playwright/test'

/**
 * Resend posts delivery events server-to-server: no session, no cookies. If
 * middleware redirects this route to /sign-in, every bounce and spam
 * complaint is swallowed silently and the suppression list never grows — the
 * exact bug that hit /api/outreach/unsubscribe.
 *
 * Deliberately never posts a validly-signed event: that would write to the
 * shared suppressions table. Signature acceptance is covered by
 * tests/unit/resend-webhook-signature.test.ts.
 */

const HOOK = '/api/resend/webhook'

test('is reachable server-to-server — never redirects to sign-in', async ({ request }) => {
  const res = await request.post(HOOK, {
    data: { type: 'email.bounced' },
    maxRedirects: 0,
  })

  expect(res.status(), 'a redirect here means bounces are silently dropped').not.toBe(307)
  expect(res.status()).not.toBe(302)
  expect(res.headers()['location'] ?? '').not.toContain('/sign-in')
})

test('an unsigned POST never reaches the suppression logic', async ({ request }) => {
  const res = await request.post(HOOK, { data: { type: 'email.complained', data: { to: ['x@y.com'] } } })
  // 400 when the secret is configured (missing signature headers), 500 when it
  // is not. Either way the request is refused — what must never happen is 200.
  expect([400, 500]).toContain(res.status())
})

test('a forged signature is refused', async ({ request }) => {
  const res = await request.post(HOOK, {
    headers: {
      'svix-id': 'msg_forged',
      'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
      'svix-signature': 'v1,Zm9yZ2VkIHNpZ25hdHVyZQ==',
    },
    data: { type: 'email.bounced', data: { to: ['victim@umich.edu'], bounce: { type: 'Permanent' } } },
  })
  expect(res.status()).not.toBe(200)
})
