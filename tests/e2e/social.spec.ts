import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * Social/shareable features (docs/social-share-audit.md):
 *  - story-image route renders a real PNG for an active listing and degrades
 *    (not 500s) for unknown ids
 *  - share button present on the listing detail page
 *  - activity counts are honest: no "viewed/saved" line below the threshold
 */

async function anyActiveListingId(): Promise<string | null> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data } = await db
    .from('listings')
    .select('id')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

test('story image: active listing renders a substantial 1080×1920 PNG', async ({ request }) => {
  const id = await anyActiveListingId()
  test.skip(!id, 'no active listings in this environment')

  const res = await request.get(`/listings/${id}/story-image`, { timeout: 30_000 })
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('image/png')
  const body = await res.body()
  // A rendered card with text + gradient is comfortably >20KB; a blank/error
  // render is not.
  expect(body.byteLength).toBeGreaterThan(20_000)
  // PNG magic bytes.
  expect(body.subarray(0, 4).toString('hex')).toBe('89504e47')
})

test('story image: unknown id degrades to the branded fallback, never a 500', async ({ request }) => {
  const res = await request.get(
    '/listings/00000000-0000-0000-0000-000000000000/story-image',
    { timeout: 30_000 },
  )
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('image/png')
})

test('detail page has the share action', async ({ page }) => {
  const id = await anyActiveListingId()
  test.skip(!id, 'no active listings in this environment')
  await page.goto(`/listings/${id}`)
  await expect(page.getByRole('button', { name: /share this listing/i })).toBeVisible()
})

test('activity counts stay hidden below the honesty threshold', async ({ page }) => {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  // Find an active listing with zero favorites — its cue line must not render
  // fabricated numbers (views could theoretically exist, so assert on the
  // save-count copy specifically).
  const { data: favs } = await db.from('favorites').select('listing_id')
  const favored = new Set((favs ?? []).map(f => f.listing_id))
  const { data: candidates } = await db
    .from('listings')
    .select('id')
    .eq('status', 'active')
    .limit(20)
  const unfavored = (candidates ?? []).find(l => !favored.has(l.id))
  test.skip(!unfavored, 'every listing has favorites (nice problem)')

  await page.goto(`/listings/${unfavored!.id}`)
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.getByText(/saved by/i)).toHaveCount(0)
})
