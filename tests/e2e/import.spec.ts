import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * AI listing importer — the flagship supply funnel (docs/prelaunch-audit.md
 * items 1, 5). Covers:
 *  - client-side form validation dead-ends
 *  - the two-phase upload contract (signed targets → direct storage PUT →
 *    finish), i.e. the fix for the 4.5MB Vercel body-cap 413
 *  - a REAL happy path: text + one image through storage + AI extraction to
 *    awaiting_admin_review (one small Anthropic call; row cleaned up after)
 *
 * Uses a throwaway email; every row it creates is deleted in afterAll.
 */

// Unique per run — the per-email rate limit (8/hr) would otherwise make the
// suite self-flaky across repeated local runs. Cleanup matches the prefix.
const TEST_EMAIL = `prelaunch-e2e-${Date.now()}@example.com`

// 1×1 red PNG.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

test.afterAll(async () => {
  const db = service()
  // Scope to THIS worker's email only — with fullyParallel, a prefix-wide
  // delete in one worker's afterAll yanks another worker's live session.
  const { data: rows } = await db
    .from('listing_import_requests')
    .select('id')
    .eq('email', TEST_EMAIL)
  for (const row of rows ?? []) {
    await db.storage.from('listing-imports').remove([
      // best-effort; folders that don't exist are a no-op
      `imports/${row.id}/personal/`,
    ])
  }
  await db.from('listing_import_requests').delete().eq('email', TEST_EMAIL)
  // Sweep stale rows from crashed past runs (never a live parallel worker).
  await db
    .from('listing_import_requests')
    .delete()
    .like('email', 'prelaunch-e2e-%')
    .lt('created_at', new Date(Date.now() - 2 * 3600_000).toISOString())
})

test('form blocks submit without any personal source', async ({ page }) => {
  await page.goto('/import-listing')
  await page.getByLabel('Your email').fill(TEST_EMAIL)
  await page.getByText('I confirm this is my listing').click()
  await page.getByRole('button', { name: /create my wroomly draft/i }).click()
  await expect(page.getByText(/add at least one photo or screenshot/i)).toBeVisible()
})

test('form blocks submit without consent', async ({ page }) => {
  await page.goto('/import-listing')
  await page.getByLabel('Your email').fill(TEST_EMAIL)
  await page.getByLabel(/description or pasted post/i).fill('Subletting my room $900/mo May-Aug near Central Campus')
  await page.getByRole('button', { name: /create my wroomly draft/i }).click()
  await expect(page.getByText(/please confirm this is your listing/i)).toBeVisible()
})

test('upload-urls rejects a bad mime type', async ({ request }) => {
  const res = await request.post('/api/listing-imports/upload-urls', {
    data: {
      email: TEST_EMAIL,
      files: [{ kind: 'personal', mimeType: 'application/x-msdownload', sizeBytes: 100 }],
    },
  })
  expect(res.status()).toBe(400)
})

test('finish rejects an unknown import session', async ({ request }) => {
  const res = await request.post('/api/listing-imports', {
    data: {
      requestId: '00000000-0000-0000-0000-000000000000',
      email: TEST_EMAIL,
      personalPastedText: 'Room $900/mo',
      personalPaths: [],
      buildingPaths: [],
      consentConfirmed: true,
      buildingEnrichmentConsent: false,
    },
  })
  expect(res.status()).toBe(409)
})

test('finish rejects paths that were never uploaded', async ({ request }) => {
  const mint = await request.post('/api/listing-imports/upload-urls', {
    data: { email: TEST_EMAIL, files: [] },
  })
  expect(mint.ok()).toBeTruthy()
  const { requestId } = await mint.json()

  const res = await request.post('/api/listing-imports', {
    data: {
      requestId,
      email: TEST_EMAIL,
      personalPastedText: 'Room $900/mo',
      personalPaths: [`imports/${requestId}/personal/999-0.jpg`], // never uploaded
      buildingPaths: [],
      consentConfirmed: true,
      buildingEnrichmentConsent: false,
    },
  })
  expect(res.status()).toBe(400)
  const json = await res.json()
  expect(json.error).toMatch(/missing/i)
})

test('full transport: signed target → direct storage PUT → finish → AI draft', async ({ request }) => {
  test.setTimeout(120_000) // includes a real AI extraction call

  // 1. Mint a signed upload target.
  const mint = await request.post('/api/listing-imports/upload-urls', {
    data: {
      email: TEST_EMAIL,
      files: [{ kind: 'personal', mimeType: 'image/png', sizeBytes: TINY_PNG.length }],
    },
  })
  expect(mint.ok()).toBeTruthy()
  const { requestId, targets } = await mint.json()
  expect(targets).toHaveLength(1)

  // 2. Upload straight to storage with the anon key + signed token — exactly
  //    what the browser does (bypasses the Vercel body cap entirely).
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
  const { error: upErr } = await anon.storage
    .from('listing-imports')
    .uploadToSignedUrl(targets[0].path, targets[0].token, TINY_PNG, {
      contentType: 'image/png',
    })
  expect(upErr).toBeNull()

  // 3. Finish — server verifies the path against storage, runs AI extraction.
  // (Playwright's default per-request timeout is 10s; extraction takes ~20s.)
  const res = await request.post('/api/listing-imports', {
    timeout: 90_000,
    data: {
      requestId,
      email: TEST_EMAIL,
      personalPastedText:
        '[E2E TEST — ignore] Subletting my furnished room in a 2bed/1bath on E William St near Central Campus, $950/mo utilities included, May 1 to Aug 15 2027.',
      personalPaths: [targets[0].path],
      buildingPaths: [],
      consentConfirmed: true,
      buildingEnrichmentConsent: false,
    },
  })
  expect(res.ok()).toBeTruthy()

  // 4. The row must be awaiting admin review with a real extracted draft.
  const db = service()
  const { data: row } = await db
    .from('listing_import_requests')
    .select('status, extracted_data')
    .eq('id', requestId)
    .single()
  expect(row?.status).toBe('awaiting_admin_review')
  const draft = row?.extracted_data as { title: string | null; rentMonthly: number | null }
  expect(draft?.title).toBeTruthy()
  expect(draft?.rentMonthly).toBe(950)

  // 5. Replay protection: finishing the same session again must 409.
  const replay = await request.post('/api/listing-imports', {
    data: {
      requestId,
      email: TEST_EMAIL,
      personalPastedText: 'replay',
      personalPaths: [],
      buildingPaths: [],
      consentConfirmed: true,
      buildingEnrichmentConsent: false,
    },
  })
  expect(replay.status()).toBe(409)
})
