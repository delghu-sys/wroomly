import { test, expect } from '@playwright/test'

/**
 * Wroomly Match — smoke coverage for the concierge chat (feature/match-world-class).
 * Exercises the real streaming chat endpoint end-to-end (not mocked) against
 * the live Anthropic models configured in lib/match/llm.ts, so a model-string
 * typo or a broken control-line protocol fails here instead of in prod.
 * Deliberately does NOT run a full 8–12 turn interview or create an alert —
 * that would burn real rate-limit budget and API cost on every CI run.
 */

test('match concierge: intro loads, chat starts, one real streamed turn completes', async ({ page }) => {
  await page.goto('/match')
  await expect(page.getByRole('button', { name: /start chatting/i })).toBeVisible()

  await page.getByRole('button', { name: /start chatting/i }).click()

  // Deterministic greeting renders instantly, no model call.
  await expect(page.getByText(/what's bringing you to ann arbor/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fall semester' })).toBeVisible()

  // One real turn against the live chat model — this is the thing a model
  // upgrade could silently break (wrong model id, streaming format change).
  const input = page.getByLabel('Your message')
  await input.fill('Grad student, moving in around August, budget is flexible.')
  await page.getByLabel('Send').click()

  // A real assistant bubble must appear with actual streamed content.
  const assistantBubbles = page.locator('.msg-row.ai .bubble.ai')
  await expect(assistantBubbles.last()).not.toHaveText('', { timeout: 30_000 })
  const text = await assistantBubbles.last().textContent()
  expect((text ?? '').trim().length).toBeGreaterThan(10)
})
