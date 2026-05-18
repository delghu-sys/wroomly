/**
 * UI-driven sign-in helper.
 *
 * The app uses @supabase/ssr which stores the session in HTTP-only-style
 * cookies that the server reads via next/headers cookies(). We can't
 * inject the session from JS — we have to drive the actual sign-in form
 * and let the Set-Cookie response do its thing.
 *
 * It's slower than localStorage injection, but reliable and exercises the
 * real auth path. For multi-test reuse, use storageState (see config).
 */

import { expect, type Page } from '@playwright/test'
import type { TestUser } from './supabase-admin'

export async function signInUiless(page: Page, user: TestUser): Promise<void> {
  await page.goto('/sign-in')
  await page.getByLabel(/email/i).fill(user.email)
  await page.getByLabel(/password/i).fill(user.password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Sign-in lands on /dashboard (or /listings if no profile). If we still
  // see /sign-in after 15s, something's wrong.
  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 })
}
