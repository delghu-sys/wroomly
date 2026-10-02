import { test, expect } from '@playwright/test'

/**
 * People arriving from an outreach email are about to PUBLISH a listing, so
 * the claim page sends new sign-ups to /sign-up?as=supplier&next=<claim link>.
 *
 * Why it matters: without `as=supplier` the Google/Apple paths default to
 * `consumer`, and a consumer who publishes owns a live listing but is bounced
 * away from /my-listings, /inquiries and /payouts — no inbox for enquiries and
 * no way to be paid. That happened on the first day of outreach.
 *
 * Covers the part that needs no seeded data: that this exact URL skips the
 * role picker and lands in the supplier flow. (The claim page's own link
 * needs a live token to render, so it is covered by reading the code.)
 */

test('a claim-style sign-up URL skips the role picker and starts as a supplier', async ({ page }) => {
  await page.goto('/sign-up?as=supplier&next=%2Fclaim-listing%2FSOMETOKEN')

  // The supplier flow is already chosen, so the picker never shows…
  await expect(page.getByText('List your U of M housing for sublet.')).toBeVisible()
  // …and there is a way back, proving it was a pre-selection and not a dead end.
  await expect(page.getByText('Back to role selection')).toBeVisible()
})

test('without as=supplier the role picker still appears', async ({ page }) => {
  // The default for everyone who is not coming from a claim link.
  await page.goto('/sign-up')
  await expect(page.getByText('List your U of M housing for sublet.')).toHaveCount(0)
})
