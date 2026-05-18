import { test, expect } from '@playwright/test'
import { createTestUser, deleteTestUser, type TestUser } from './helpers/supabase-admin'
import { signInUiless } from './helpers/auth'

/**
 * Page-load smoke tests. Each page should:
 *   - return a non-error HTTP status
 *   - render its primary heading
 *   - not log any errors to the console (catches hydration warnings,
 *     thrown React errors, missing env vars, etc.)
 */

const PUBLIC_PAGES = [
  { path: '/', heading: /room.*for|wroomly|home|swap|sublet/i },
  { path: '/listings', heading: /browse|listings|find|home/i },
  { path: '/sign-in', heading: /sign in|welcome/i },
  { path: '/sign-up', heading: /sign up|join|create/i },
  { path: '/reset-password', heading: /password|reset|expired/i },
  { path: '/terms', heading: /terms/i },
  { path: '/privacy', heading: /privacy/i },
]

for (const page of PUBLIC_PAGES) {
  test(`public ${page.path} loads cleanly`, async ({ page: p }) => {
    const errors: string[] = []
    p.on('pageerror', err => errors.push(err.message))
    p.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Filter known-noisy errors not caused by our code: dev-only
        // hydration warnings from third-party scripts, missing favicons,
        // 404s on optional OG images.
        if (text.includes('favicon')) return
        if (text.includes('og-default')) return
        errors.push(text)
      }
    })

    const res = await p.goto(page.path)
    expect(res?.status(), `HTTP status for ${page.path}`).toBeLessThan(400)

    // First h1 usually carries the section title.
    await expect(p.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })

    expect(errors, `console errors on ${page.path}`).toEqual([])
  })
}

test.describe('Authenticated pages', () => {
  let user: TestUser

  test.beforeEach(async () => {
    user = await createTestUser()
  })

  test.afterEach(async () => {
    if (user) await deleteTestUser(user)
  })

  const PRIVATE_PAGES = [
    '/dashboard',
    '/messages',
    '/profile',
    '/favorites',
    '/applications',
  ]

  for (const path of PRIVATE_PAGES) {
    test(`signed-in ${path} loads cleanly`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', err => errors.push(err.message))
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text()
          if (text.includes('favicon')) return
          errors.push(text)
        }
      })

      await signInUiless(page, user)
      const res = await page.goto(path)
      expect(res?.status(), `HTTP status for ${path}`).toBeLessThan(400)

      // We're a real user — should not get redirected to sign-in.
      await expect(page).not.toHaveURL(/\/sign-in/)

      expect(errors, `console errors on ${path}`).toEqual([])
    })
  }
})
