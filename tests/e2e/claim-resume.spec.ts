import { test, expect } from '@playwright/test'

/**
 * Ways back to an approved draft (lib/listing-import/waiting-drafts). Neither
 * route may reveal whether a draft exists, and neither may act for a stranger.
 */
test('a fresh-link request answers the same whether or not the token exists', async ({ request }) => {
  const res = await request.post('/api/listing-imports/refresh', { data: { token: 'not-a-real-token' } })
  expect(res.status()).toBe(200)
  expect((await res.json()).message).toContain('If this draft is still waiting')
})

test('a malformed fresh-link request is rejected', async ({ request }) => {
  const res = await request.post('/api/listing-imports/refresh', { data: {} })
  expect(res.status()).toBe(400)
})

test('resuming a draft requires signing in', async ({ request }) => {
  const res = await request.post('/api/listing-imports/resume', {
    form: { requestId: '00000000-0000-0000-0000-000000000000' },
    maxRedirects: 0,
  })
  expect(res.status()).toBe(303)
  expect(res.headers()['location']).toContain('/sign-in')
})
