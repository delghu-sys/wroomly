import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { RawLead, SourceAdapter } from '../../src/lib/agents/source-adapter.ts'

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
  extracted: {},
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

test('the same run against the live origin does send, minting the token as it goes', async () => {
  process.env.OUTREACH_ENABLED = 'true'
  const sent: string[] = []
  const writes: Record<string, unknown>[] = []
  const links: string[] = []
  const r = await runOutreach(fakeDb([lead], writes), {
    execute: true,
    origin: 'https://wroomly.app',
    send: async ({ to, text }) => {
      sent.push(to)
      links.push(text.match(/https:\/\/wroomly\.app\/claim-listing\/(\S+)/)?.[1] ?? '')
    },
  })
  assert.deepEqual(sent, ['stranger@umich.edu'])
  assert.equal(r.sent, 1)
  assert.ok(links[0] && links[0].length > 20, 'a real token is in the link')

  // The token is minted for THIS send, so a hash and a fresh expiry are
  // written before the email goes out — that is what stops a queued draft
  // being mailed with a link that expired while it waited.
  const minted = writes.find(w => w.claim_token_hash)
  assert.ok(minted, 'a token was issued')
  assert.ok(new Date(String(minted.claim_token_expires_at)) > new Date(), 'with a future expiry')
  assert.ok(writes.some(w => w.status === 'contacted'), 'and the lead is marked contacted')
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
  // The token does not exist until the send, so the preview masks it — but
  // the ORIGIN is still shown, which is the thing a dry run exists to reveal.
  assert.ok(r.sample?.text.includes('http://localhost:3000/claim-listing/'))
  assert.deepEqual(r.errors, [], 'a dry run is not an error — it is how you see the bad link')
})

// ── discovery remembers what it rejected ───────────────────────────────────
//
// Rejected posts used not to be written anywhere, so they never entered
// `knownIds` and every run re-fetched them. On a board that is mostly expired
// posts that means discovery re-downloads the same dead pages forever and
// never reaches newer ones — the "it only ever finds expired listings" bug.

const { runDiscover } = await import('../../src/lib/agents/runner.ts')

function recordingDb(writes: Record<string, unknown>[]) {
  const chain: Record<string, unknown> = {}
  Object.assign(chain, {
    select: () => chain,
    eq: () => chain,
    upsert: (row: Record<string, unknown>) => {
      writes.push(row)
      return chain
    },
    then: (resolve: (v: unknown) => void) => resolve({ data: [{ id: 'x' }], error: null }),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: () => chain } as any
}

const fakeAdapter = (leads: RawLead[]): SourceAdapter => ({
  key: 'test-source',
  label: 'Test source',
  contactBasis: 'test',
  fetchLeads: async () => leads,
})

test('an expired post is written as skipped, so the next run does not re-fetch it', async () => {
  const writes: Record<string, unknown>[] = []
  const r = await runDiscover(recordingDb(writes), {
    sourceKeys: ['test-source'],
    execute: true,
    adapters: [
      fakeAdapter([
        { sourceExternalId: 'live-1', title: '1 Live St', contactEmail: 'a@b.com', extracted: { dates: 'January to August 2028' } },
        { sourceExternalId: 'dead-1', title: '2 Dead St', contactEmail: 'c@d.com', extracted: { dates: 'January to August 2020' } },
      ]),
    ],
  })

  assert.equal(r.sources[0].found, 1, 'only the live one counts as found')
  assert.equal(r.sources[0].remembered, 1, 'but the dead one is still recorded')

  const dead = writes.find(w => w.source_external_id === 'dead-1')
  assert.ok(dead, 'the rejected post IS written')
  assert.equal(dead.status, 'skipped')
  assert.match(String(dead.skip_reason), /term already ended/)
  assert.equal(dead.contact_email, null, 'we do not keep an address for someone we refused to write to')

  const live = writes.find(w => w.source_external_id === 'live-1')
  assert.equal(live?.contact_email, 'a@b.com')
  assert.equal(live?.status, undefined, 'a normal lead keeps the table default')
})

test('a post with no stable id is not recorded — there is nothing to dedupe on', async () => {
  const writes: Record<string, unknown>[] = []
  const r = await runDiscover(recordingDb(writes), {
    sourceKeys: ['test-source'],
    execute: true,
    adapters: [fakeAdapter([{ sourceExternalId: '', title: 'nameless' }])],
  })
  assert.equal(r.sources[0].remembered, 0)
  assert.deepEqual(writes, [])
})
