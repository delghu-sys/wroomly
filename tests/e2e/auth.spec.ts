import { test, expect } from '@playwright/test'
import { createTestUser, deleteTestUser, type TestUser } from './helpers/supabase-admin'

test.describe('Auth flow', () => {
  let user: TestUser

  test.beforeEach(async () => {
    user = await createTestUser()
  })

  test.afterEach(async () => {
    if (user) await deleteTestUser(user)
  })

  test('signs in with valid credentials', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill(user.email)
    await page.getByLabel(/password/i).fill(user.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Sign-in redirects to `next` if present, else home — see
    // "feat(auth): land on home page after sign-in instead of /dashboard".
    await expect(page).toHaveURL(/\/(dashboard|listings|profile)?$/, { timeout: 15_000 })
  })

  test('shows generic error on wrong password (no enumeration)', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill(user.email)
    await page.getByLabel(/password/i).fill('definitely-wrong-password')
    await page.getByRole('button', { name: /sign in/i }).click()

    // The audit fix collapsed "wrong password" and "no such user" to the
    // same message so an attacker can't enumerate registered emails.
    await expect(page.getByText(/didn(['’]| no)t match/i)).toBeVisible({ timeout: 5_000 })
  })

  test('shows the same generic error for nonexistent email', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill('nobody-xyz-12345@umich.edu')
    await page.getByLabel(/password/i).fill('whatever-pw-123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/didn(['’]| no)t match/i)).toBeVisible({ timeout: 5_000 })
  })

  test('reset-password page renders without a recovery session', async ({ page }) => {
    await page.goto('/reset-password')
    // We expect either the "link expired" branch or the form itself.
    const hasExpiredOrForm = await Promise.race([
      page.getByText(/expired|invalid/i).waitFor({ timeout: 3_000 }).then(() => true).catch(() => false),
      page.getByLabel(/new password/i).waitFor({ timeout: 3_000 }).then(() => true).catch(() => false),
    ])
    expect(hasExpiredOrForm).toBe(true)
  })
})
