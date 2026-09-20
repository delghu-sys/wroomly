import { test } from 'node:test'
import assert from 'node:assert/strict'

// The real signer refuses anything under 32 chars.
process.env.OUTREACH_SECRET ??= 'unit-test-secret-000000000000000000000000'

const { runTestSend } = await import('../../src/lib/agents/runner.ts')

/**
 * runTestSend exists so a human can check the outreach email in a real inbox.
 * Its refusals are the interesting part: a "test" that quietly mails a real
 * lead, or that mails a claim link which 404s, is worse than no test at all.
 *
 * The fake below implements only the query shapes runTestSend actually uses.
 * `update` throws on purpose — the test asserts a test send never writes.
 */
function fakeDb({
  leads = [] as Record<string, unknown>[],
  suppressions = [] as { email: string }[],
  importRequest = null as Record<string, unknown> | null,
  template = null as Record<string, unknown> | null,
}) {
  const tables: Record<string, unknown> = {
    sourced_leads: leads,
    outreach_suppressions: suppressions,
  }
  return {
    from(table: string) {
      const rows = tables[table] ?? []
      const single = table === 'listing_import_requests' ? importRequest : template
      const chain = {
        select: () => chain,
        eq: () => chain,
        limit: () => Promise.resolve({ data: rows, error: null }),
        maybeSingle: () => Promise.resolve({ data: single, error: null }),
        update: () => {
          throw new Error(`a test send must never write — update() called on ${table}`)
        },
        // `.select('email')` is awaited directly in one place.
        then: (resolve: (v: unknown) => void) => resolve({ data: rows, error: null }),
      }
      return chain
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

const drafted = (over: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  contact_email: 'stranger@umich.edu',
  status: 'drafted',
  import_request_id: 'req-1',
  outreach_sent_at: null,
  title: '2 Bed on Tappan',
  source: 'offcampus-universe-umich',
  source_url: 'https://example.test/listing',
  extracted: { _claimToken: 'tok_abc' },
  ...over,
})

const goodRequest = {
  status: 'completed',
  claim_token_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  extracted_data: { photos: [] },
  claimed_by_user_id: null,
}

const neverSend = async () => {
  throw new Error('send() must not be called')
}

test('REFUSES an address that belongs to a real lead', async () => {
  const r = await runTestSend(fakeDb({ leads: [drafted()], importRequest: goodRequest }), {
    to: 'Stranger@UMich.edu', // different case — normalization must still catch it
    send: neverSend,
    execute: true,
  })
  assert.equal(r.sent, false)
  assert.match(r.error ?? '', /belongs to a real lead/)
})

test('REFUSES a suppressed address', async () => {
  const r = await runTestSend(
    fakeDb({ leads: [drafted()], suppressions: [{ email: 'me@wroomly.app' }], importRequest: goodRequest }),
    { to: 'me@wroomly.app', send: neverSend, execute: true },
  )
  assert.equal(r.sent, false)
  assert.match(r.error ?? '', /suppression list/)
})

test('REFUSES to mail a claim link that would not resolve, but still reports which check failed', async () => {
  const r = await runTestSend(
    fakeDb({
      leads: [drafted()],
      importRequest: { ...goodRequest, status: 'pending' },
    }),
    { to: 'me@wroomly.app', send: neverSend, execute: true },
  )
  assert.equal(r.sent, false)
  assert.match(r.error ?? '', /would not resolve/)
  const failed = r.linkChecks.filter(c => !c.ok).map(c => c.label)
  assert.deepEqual(failed, ["status is 'completed'"], 'the UI can show exactly what was wrong')
})

test('an already-claimed draft is refused — that link is spent', async () => {
  const r = await runTestSend(
    fakeDb({ leads: [drafted()], importRequest: { ...goodRequest, claimed_by_user_id: 'u1' } }),
    { to: 'me@wroomly.app', send: neverSend, execute: true },
  )
  assert.equal(r.sent, false)
  assert.ok(r.linkChecks.find(c => c.label === 'not already claimed')?.ok === false)
})

test('an expired token is refused', async () => {
  const r = await runTestSend(
    fakeDb({
      leads: [drafted()],
      importRequest: { ...goodRequest, claim_token_expires_at: new Date(Date.now() - 1000).toISOString() },
    }),
    { to: 'me@wroomly.app', send: neverSend, execute: true },
  )
  assert.equal(r.sent, false)
  assert.ok(r.linkChecks.find(c => c.label === 'token not expired')?.ok === false)
})

test('sends the real email to the test address, and NEVER writes to the lead', async () => {
  const sentTo: string[] = []
  const bodies: string[] = []
  const r = await runTestSend(fakeDb({ leads: [drafted()], importRequest: goodRequest }), {
    to: 'me@wroomly.app',
    execute: true,
    origin: 'https://wroomly.app',
    send: async ({ to, text }) => {
      sentTo.push(to)
      bodies.push(text)
    },
  })

  assert.equal(r.sent, true)
  assert.deepEqual(sentTo, ['me@wroomly.app'], 'the stranger is never mailed')
  assert.ok(bodies[0].includes('https://wroomly.app/claim-listing/tok_abc'), 'the real claim link is in the body')
  assert.ok(bodies[0].includes('2 Bed on Tappan'), 'the real lead title is substituted')
  // fakeDb.update throws — reaching here at all proves nothing was written.
})

test('a dry run builds the whole email but sends nothing', async () => {
  const r = await runTestSend(fakeDb({ leads: [drafted()], importRequest: goodRequest }), {
    to: 'me@wroomly.app',
    send: neverSend,
    execute: false,
  })
  assert.equal(r.sent, false)
  assert.equal(r.error, undefined)
  assert.ok(r.email?.subject)
  assert.ok(r.email?.text.includes('claim-listing/tok_abc'))
  assert.ok(r.linkChecks.every(c => c.ok))
})

test('returns the lead contact DOMAIN only — a real address never reaches the browser', async () => {
  const r = await runTestSend(fakeDb({ leads: [drafted()], importRequest: goodRequest }), {
    to: 'me@wroomly.app',
    send: neverSend,
    execute: false,
  })
  assert.equal(r.lead?.contactDomain, 'umich.edu')
  assert.equal(JSON.stringify(r).includes('stranger@umich.edu'), false)
})

test('nothing queued is an explicit error, not a silent no-op', async () => {
  const r = await runTestSend(fakeDb({ leads: [drafted({ status: 'contacted' })] }), {
    to: 'me@wroomly.app',
    send: neverSend,
    execute: true,
  })
  assert.equal(r.sent, false)
  assert.match(r.error ?? '', /Nothing is queued/)
})
