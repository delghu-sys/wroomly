import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.OUTREACH_SECRET ??= 'unit-test-secret-000000000000000000000000'

const { isPublicOrigin, runOutreach } = await import('../../src/lib/agents/runner.ts')

/**
 * The claim link IS the outreach email. Because the raw token is dropped from
 * the database once a message is sent, a bad origin cannot be corrected by
 * resending — it permanently burns every lead in the batch. Hence a hard gate
 * rather than a warning.
 */

test('accepts the live site', () => {
  assert.equal(isPublicOrigin('https://wroomly.app'), true)
  assert.equal(isPublicOrigin('https://www.wroomly.app'), true)
  assert.equal(isPublicOrigin('https://wroomly-git-preview.vercel.app'), true)
})

test('rejects the dev values that ride along in a local env file', () => {
  assert.equal(isPublicOrigin('http://localhost:3000'), false, 'the actual bug')
  assert.equal(isPublicOrigin('https://localhost:3000'), false)
  assert.equal(isPublicOrigin('http://127.0.0.1:3000'), false)
  assert.equal(isPublicOrigin('https://macbook.local'), false)
  assert.equal(isPublicOrigin('https://app.internal'), false)
})

test('rejects plain http even on a real domain — the link must not downgrade', () => {
  assert.equal(isPublicOrigin('http://wroomly.app'), false)
})

test('rejects junk rather than throwing', () => {
  assert.equal(isPublicOrigin(''), false)
  assert.equal(isPublicOrigin('wroomly.app'), false, 'no protocol is not a URL')
  assert.equal(isPublicOrigin('not a url at all'), false)
})

// ── the gate inside runOutreach ─────────────────────────────────────────────

/** `writes` collects every update() the runner performs, so a test can assert
 *  both that a refused run writes nothing and that a real send marks the lead. */
function fakeDb(leads: Record<string, unknown>[], writes: Record<string, unknown>[] = []) {
  const tables: Record<string, unknown> = { sourced_leads: leads, outreach_suppressions: [] }
  return {
    from(table: string) {
      const rows = tables[table] ?? []
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        gte: () => chain,
        limit: () => Promise.resolve({ data: rows, error: null, count: 0 }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        update: (patch: Record<string, unknown>) => {
          writes.push(patch)
          return chain
        },
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: rows, error: null, count: 0 }),
      }
      return chain
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

const lead = {
  id: '11111111-1111-4111-8111-111111111111',
  contact_email: 'stranger@umich.edu',
  status: 'drafted',
  import_request_id: 'req-1',
  outreach_sent_at: null,
  title: 'A Sublet',
  extracted: { _claimToken: 'tok_abc' },
}

test('a real send with a localhost origin sends NOTHING, writes nothing, and says why', async () => {
  process.env.OUTREACH_ENABLED = 'true'
  const sent: string[] = []
  const writes: Record<string, unknown>[] = []
  const r = await runOutreach(fakeDb([lead], writes), {
    execute: true,
    origin: 'http://localhost:3000',
    send: async ({ to }) => {
      sent.push(to)
    },
  })

  assert.deepEqual(sent, [], 'no stranger got a dead link')
  assert.deepEqual(writes, [], 'and the leads are still contactable — nothing was marked sent')
  assert.equal(r.sent, 0)
  assert.equal(r.planned, 1, 'it still planned the send — only delivery was refused')
  assert.match(r.errors[0] ?? '', /not a public https URL/)
})

test('the same run against the live origin does send, and burns the token as designed', async () => {
  process.env.OUTREACH_ENABLED = 'true'
  const sent: string[] = []
  const writes: Record<string, unknown>[] = []
  const r = await runOutreach(fakeDb([lead], writes), {
    execute: true,
    origin: 'https://wroomly.app',
    send: async ({ to, text }) => {
      sent.push(to)
      assert.ok(text.includes('https://wroomly.app/claim-listing/tok_abc'))
    },
  })
  assert.deepEqual(sent, ['stranger@umich.edu'])
  assert.equal(r.sent, 1)
  assert.equal(writes[0]?.status, 'contacted')
  assert.equal(
    (writes[0]?.extracted as Record<string, unknown>)?._claimToken,
    undefined,
    'the raw token is dropped after sending — which is exactly why a bad origin is unrecoverable',
  )
})

test('a dry run still previews the localhost link rather than hiding it', async () => {
  process.env.OUTREACH_ENABLED = 'true'
  const r = await runOutreach(fakeDb([lead]), {
    execute: false,
    origin: 'http://localhost:3000',
    send: async () => {
      throw new Error('a dry run must not send')
    },
  })
  assert.equal(r.sent, 0)
  assert.ok(r.sample?.text.includes('http://localhost:3000/claim-listing/tok_abc'))
  assert.deepEqual(r.errors, [], 'a dry run is not an error — it is how you see the bad link')
})
