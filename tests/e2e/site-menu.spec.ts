import { test, expect } from '@playwright/test'

/**
 * The "☰ Menu" button: every part of the site in one place, for a visitor who
 * is not signed in. Before it, guides, buildings, safety and the exchange page
 * were only reachable from the footer.
 */

test.use({ viewport: { width: 1280, height: 800 } })

test('Menu opens the site menu, Escape closes it', async ({ page }) => {
  await page.goto('/guides')
  const button = page.getByRole('button', { name: /^menu$/i })
  await expect(button).toBeVisible()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await button.click()
  const menu = page.getByRole('navigation', { name: 'Site menu' })
  await expect(menu).toBeVisible()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  for (const name of ['All guides', 'Buildings', 'Trust & safety', 'Exchange students', 'List your place', 'Sign in']) {
    await expect(menu.getByRole('link', { name })).toBeVisible()
  }
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(button).toBeFocused()
})

test('a link in the menu navigates and the menu is gone on the new page', async ({ page }) => {
  await page.goto('/guides')
  await page.getByRole('button', { name: /^menu$/i }).click()
  await page.getByRole('navigation', { name: 'Site menu' }).getByRole('link', { name: 'Trust & safety' }).click()
  await expect(page).toHaveURL(/\/safety$/, { timeout: 30_000 })
  await expect(page.getByRole('navigation', { name: 'Site menu' })).toBeHidden()
})

test('a click outside closes the menu', async ({ page }) => {
  await page.goto('/guides')
  await page.getByRole('button', { name: /^menu$/i }).click()
  const menu = page.getByRole('navigation', { name: 'Site menu' })
  await expect(menu).toBeVisible()
  await page.mouse.click(640, 760)
  await expect(menu).toBeHidden()
})

// ── phone: four categories first, links on tap ──────────────────────────────

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('the menu opens as four categories with no links showing', async ({ page }) => {
    await page.goto('/guides')
    await page.getByRole('button', { name: 'Toggle menu' }).click()
    const menu = page.getByRole('navigation', { name: 'Site menu' })
    await expect(menu).toBeVisible()
    for (const name of ['Find a place', 'Hosting', 'Learn', 'Account']) {
      await expect(menu.getByRole('button', { name })).toBeVisible()
      await expect(menu.getByRole('button', { name })).toHaveAttribute('aria-expanded', 'false')
    }
    // Nothing underneath is showing until a category is opened.
    await expect(menu.getByRole('link', { name: 'Trust & safety' })).toBeHidden()
    await expect(menu.getByRole('link', { name: 'Browse sublets' })).toBeHidden()
  })

  test('tapping a category opens its links, and opening another closes the first', async ({ page }) => {
    await page.goto('/guides')
    await page.getByRole('button', { name: 'Toggle menu' }).click()
    const menu = page.getByRole('navigation', { name: 'Site menu' })
    await menu.getByRole('button', { name: 'Learn' }).click()
    await expect(menu.getByRole('button', { name: 'Learn' })).toHaveAttribute('aria-expanded', 'true')
    await expect(menu.getByRole('link', { name: 'Trust & safety' })).toBeVisible()
    await menu.getByRole('button', { name: 'Find a place' }).click()
    await expect(menu.getByRole('link', { name: 'Browse sublets' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Trust & safety' })).toBeHidden()
  })

  test('a link still works, and the menu reopens with every category closed', async ({ page }) => {
    await page.goto('/guides')
    await page.getByRole('button', { name: 'Toggle menu' }).click()
    const menu = page.getByRole('navigation', { name: 'Site menu' })
    await menu.getByRole('button', { name: 'Learn' }).click()
    await menu.getByRole('link', { name: 'How it works' }).click()
    await expect(page).toHaveURL(/\/about$/, { timeout: 30_000 })
    await page.getByRole('button', { name: 'Toggle menu' }).click()
    await expect(page.getByRole('navigation', { name: 'Site menu' }).getByRole('button', { name: 'Learn' })).toHaveAttribute('aria-expanded', 'false')
  })
})
