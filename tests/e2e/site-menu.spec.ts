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
