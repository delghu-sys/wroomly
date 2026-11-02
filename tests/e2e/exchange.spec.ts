import { test, expect } from '@playwright/test'

/**
 * The exchange-office overview must open for a logged-out stranger.
 *
 * It is the link in our outreach emails, sent to exchange offices at other
 * universities. They have no Wroomly account. If /exchange were gated like the
 * rest of the app, every recipient who clicked would land on a sign-in wall —
 * silently defeating the page. It was not in the public-routes list at first.
 */

test('opens without a session — no redirect to sign-in or coming-soon', async ({ request }) => {
  const res = await request.get('/exchange', { maxRedirects: 0 })
  expect(res.status(), 'a redirect here means the offices we email cannot read it').toBe(200)
})

test('shows the overview, with a way to browse and a note that it is independent', async ({ page }) => {
  const res = await page.goto('/exchange')
  expect(res?.status()).toBe(200)
  await expect(page).toHaveURL(/\/exchange$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/exchange students/i)
  await expect(page.getByRole('link', { name: /browse sublets/i })).toBeVisible()
  // The site footer says it too; this checks the page's own footnote.
  await expect(page.locator('article').getByText(/not affiliated with the University of Michigan/i)).toBeVisible()
})

test('says nothing about prices or numbers it cannot keep current', async ({ page }) => {
  await page.goto('/exchange')
  const text = (await page.locator('article').innerText()).toLowerCase()
  expect(text).not.toMatch(/below market|cheapest|\$\d/)
})
