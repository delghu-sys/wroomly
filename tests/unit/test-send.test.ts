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
  writes = [] as Record<string, unknown>[],
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
        update: (patch: Record<string, unknown>) => {
          // Minting a token IS a write, and the only one a test send makes.
          // Writing to sourced_leads would mean consuming the lead, which is
          // still forbidden.
          if (table === 'sourced_leads') {
            throw new Error('a test send must never write to sourced_leads')
          }
          writes.push(patch)
          return chain
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
  extracted: {},
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

// NOTE: there is no longer an "expired token" case to test. The token is
// minted at send time, so whatever a draft held before is irrelevant — which
// is the whole point of the change: a queued draft can no longer be mailed
// with a link that expired while it waited.

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
  assert.ok(/https:\/\/wroomly\.app\/claim-listing\/\S{20,}/.test(bodies[0]), 'a real minted claim link is in the body')
  assert.ok(bodies[0].includes('2 Bed on Tappan'), 'the real lead title is substituted')
  // fakeDb throws on any sourced_leads write — reaching here proves the lead
  // was not consumed, even though a token was minted on the import request.
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
  assert.ok(/claim-listing\/\S{20,}/.test(r.email?.text ?? ''))
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

// ── choosing a lead whose link actually works ───────────────────────────────
//
// Opening a claim page claims the draft (ClaimReview posts /claim on mount),
// so a lead an admin has previewed is permanently unusable for a test send.
// One spent draft at the front of the queue must not block the whole test
// when other leads are sitting right behind it.

const secondLead = {
  id: '22222222-2222-4222-8222-222222222222',
  contact_email: 'other@umich.edu',
  status: 'drafted',
  import_request_id: 'req-2',
  outreach_sent_at: null,
  title: 'Another Sublet',
  source: 'offcampus-universe-umich',
  source_url: 'https://example.test/second',
  extracted: {},
}

/** Resolves a different import request per request id, so leads can differ. */
function fakeDbByToken(leads: Record<string, unknown>[], byRequestId: Record<string, unknown>) {
  const tables: Record<string, unknown> = { sourced_leads: leads, outreach_suppressions: [] }
  return {
    from(table: string) {
      const rows = tables[table] ?? []
      let wanted: unknown = null
      const chain = {
        select: () => chain,
        eq: (col: string, val: string) => {
          if (col === 'id' && val in byRequestId) wanted = byRequestId[val]
          return chain
        },
        limit: () => Promise.resolve({ data: rows, error: null }),
        maybeSingle: () => Promise.resolve({ data: wanted, error: null }),
        update: () => chain,
        then: (resolve: (v: unknown) => void) => resolve({ data: rows, error: null }),
      }
      return chain
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

test('skips a lead whose draft was already claimed and uses the next one', async () => {
  const sent: string[] = []
  const r = await runTestSend(
    fakeDbByToken([drafted(), secondLead], {
      'req-1': { ...goodRequest, claimed_by_user_id: 'admin-who-opened-the-link' },
      'req-2': goodRequest,
    }),
    {
      to: 'me@wroomly.app',
      execute: true,
      send: async ({ to, text }) => {
        sent.push(to)
        assert.ok(/claim-listing\/\S{20,}/.test(text), 'a freshly minted link is mailed')
      },
    },
  )

  assert.equal(r.sent, true)
  assert.equal(r.skippedLeads, 1, 'and it says it skipped one')
  assert.equal(r.lead?.title, 'Another Sublet')
  assert.ok(r.linkChecks.every(c => c.ok), 'the reported checks belong to the lead actually used')
  assert.deepEqual(sent, ['me@wroomly.app'])
})

test('when EVERY draft is spent it fails, and reports how many it tried', async () => {
  const r = await runTestSend(
    fakeDbByToken([drafted(), secondLead], {
      'req-1': { ...goodRequest, claimed_by_user_id: 'u1' },
      'req-2': { ...goodRequest, claimed_by_user_id: 'u2' },
    }),
    { to: 'me@wroomly.app', send: neverSend, execute: true },
  )
  assert.equal(r.sent, false)
  assert.equal(r.skippedLeads, 2)
  assert.match(r.error ?? '', /checked 2 lead\(s\)/)
})

test('an explicitly requested lead is never silently swapped for a different one', async () => {
  const r = await runTestSend(
    fakeDbByToken([drafted(), secondLead], {
      'req-1': { ...goodRequest, claimed_by_user_id: 'u1' },
      'req-2': goodRequest,
    }),
    {
      to: 'me@wroomly.app',
      send: neverSend,
      execute: true,
      leadId: '11111111-1111-4111-8111-111111111111',
    },
  )
  assert.equal(r.sent, false, 'asking for one lead and getting another would be worse than failing')
  assert.equal(r.lead?.id, '11111111-1111-4111-8111-111111111111')
})
