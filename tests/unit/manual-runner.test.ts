import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recordFirstContact, addManualMessage, setManualState, prepareClaimLink, loadManualItems } from '../../src/lib/agents/manual-runner.ts'
import { redactClaimLinks } from '../../src/lib/agents/manual-outreach.ts'
import { hashClaimToken } from '../../src/lib/listing-import/claim-token.ts'

// In-memory stand-in for the two tables manual outreach touches. Only the query
// shapes it uses are implemented. All data is INVENTED.
type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

function fakeDb(leads: Row[]) {
  const tables: Record<string, Row[]> = { sourced_leads: leads, listing_import_requests: [] }
  let seq = 0
  return {
    tables,
    from(name: string) {
      const filters: ((r: Row) => boolean)[] = []
      let op: 'select' | 'update' | 'insert' = 'select'
      let patch: Row = {}
      let order: { k: string; asc: boolean } | null = null
      const run = () => {
        if (op === 'insert') { const row = { id: `req-${++seq}`, ...patch }; tables[name].push(row); return { data: [{ ...row }], error: null } }
        let rows = tables[name].filter(r => filters.every(f => f(r)))
        if (order) rows = [...rows].sort((a, b) => (a[order!.k] < b[order!.k] ? -1 : 1) * (order!.asc ? 1 : -1))
        if (op === 'update') for (const r of rows) Object.assign(r, patch)
        return { data: rows.map(r => ({ ...r })), error: null }
      }
      const api: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
        select: () => api,
        eq: (k: string, v: unknown) => (filters.push(r => r[k] === v), api),
        is: (k: string, v: unknown) => (filters.push(r => (v === null ? r[k] == null : r[k] === v)), api),
        order: (k: string, o?: { ascending?: boolean }) => ((order = { k, asc: o?.ascending !== false }), api),
        update: (p: Row) => ((op = 'update'), (patch = p), api),
        insert: (p: Row) => ((op = 'insert'), (patch = p), api),
        maybeSingle: () => Promise.resolve({ data: run().data?.[0] ?? null, error: null }),
        single: () => Promise.resolve({ data: run().data?.[0] ?? null, error: null }),
        then: (res: (v: unknown) => void) => res(run()),
      }
      return api
    },
  }
}

const lead = (o: Row = {}): Row => ({
  id: 'l1', source: 'subleaps-a2', source_external_id: 'ext-1', source_url: 'https://subleaps.com/listings/ext-1',
  title: 'Winter 2027 room near campus', status: 'new', contact_email: null, import_request_id: null,
  outreach_sent_at: null, discovered_at: '2026-11-03T00:00:00Z',
  extracted: { price: '$1,200', dates: 'December 18, 2026 to July 30, 2027', description: 'A quiet room.', bedrooms: '4', bathrooms: '2' }, ...o,
})
const D = (db: ReturnType<typeof fakeDb>) => db as any // eslint-disable-line @typescript-eslint/no-explicit-any
const first = { source: 'subleaps-a2', externalId: 'ext-1', channel: 'subleaps', channelLabel: 'SubLeaps', conversationUrl: 'https://subleaps.com/inbox/abc', text: 'Hi', at: new Date('2026-11-03T20:00:00Z') }

test('recording the first message marks the lead contacted, once', async () => {
  const db = fakeDb([lead()])
  await recordFirstContact(D(db), first)
  const row = db.tables.sourced_leads[0]
  assert.equal(row.status, 'contacted')
  assert.equal(row.outreach_sent_at, '2026-11-03T20:00:00.000Z')
  assert.equal(row.extracted.manual.state, 'waiting')
  assert.equal(row.extracted.manual.conversationUrl, 'https://subleaps.com/inbox/abc')
  assert.equal(row.extracted.price, '$1,200', 'the lead facts are kept')
  await assert.rejects(recordFirstContact(D(db), first), /already has a message/)
  await assert.rejects(recordFirstContact(D(db), { ...first, externalId: 'nope' }), /No lead/)
})

test('a reply makes the lead need action, with the right message prepared', async () => {
  const db = fakeDb([lead()])
  await recordFirstContact(D(db), first)
  await addManualMessage(D(db), 'l1', { dir: 'in', at: '2026-11-04T10:00:00Z', text: 'Yes, interested! send me the link' })
  const [item] = await loadManualItems(D(db), new Date('2026-11-04T12:00:00Z'))
  assert.equal(item.thread.state, 'replied')
  assert.equal(item.next.due, true)
  assert.equal(item.next.tone, 'positive')
  assert.match(item.next.text ?? '', /\{\{claim_link\}\}/)
  await setManualState(D(db), 'l1', 'listed')
  assert.equal((await loadManualItems(D(db)))[0].next.kind, 'done')
})

test('items needing action come first; leads with an email are not manual leads', async () => {
  const db = fakeDb([lead({ id: 'a', source_external_id: 'a' }), lead({ id: 'b', source_external_id: 'b' }), lead({ id: 'c', source_external_id: 'c', contact_email: 'x@example.com', status: 'contacted' })])
  await recordFirstContact(D(db), { ...first, externalId: 'a', at: new Date('2026-11-03T20:00:00Z') })
  await recordFirstContact(D(db), { ...first, externalId: 'b', at: new Date('2026-10-28T20:00:00Z') }) // old: follow-up due
  const items = await loadManualItems(D(db), new Date('2026-11-04T12:00:00Z'))
  assert.deepEqual(items.map(i => i.id), ['b', 'a'])
  assert.equal(items[0].next.kind, 'follow-up')
})

test('a claim link makes the draft, stores only the token hash, and a second link replaces the first', async () => {
  const db = fakeDb([lead()])
  await recordFirstContact(D(db), first)
  const a = await prepareClaimLink(D(db), 'l1', 'https://wroomly.app')
  assert.equal(a.createdDraft, true)
  const token = a.url.split('/claim-listing/')[1]
  const req = db.tables.listing_import_requests[0]
  assert.equal(req.status, 'completed', 'the claim page renders only completed drafts')
  assert.equal(req.consent_confirmed, false, 'claiming is the consent')
  assert.match(req.email, /@manual\.invalid$/, 'a placeholder that can never be mailed')
  assert.equal(req.claim_token_hash, hashClaimToken(token))
  assert.ok(!JSON.stringify(db.tables).includes(token), 'the raw token is stored nowhere')
  assert.equal(req.extracted_data.rentMonthly, 1200)
  assert.equal(req.extracted_data.bedrooms, 4, 'beds and baths carry into the draft')
  assert.equal(req.extracted_data.contactInfoFoundInOriginalPost.email, null)
  assert.equal(req.extracted_data.lat, null, 'never a guessed location')
  assert.deepEqual(req.extracted_data.photos, [])
  assert.equal(db.tables.sourced_leads[0].import_request_id, req.id)
  assert.ok(db.tables.sourced_leads[0].extracted.manual.claimLinkIssuedAt)

  const b = await prepareClaimLink(D(db), 'l1', 'https://wroomly.app/')
  assert.equal(b.createdDraft, false, 'the draft is reused')
  assert.equal(db.tables.listing_import_requests.length, 1)
  assert.notEqual(b.url, a.url)
  assert.equal(db.tables.listing_import_requests[0].claim_token_hash, hashClaimToken(b.url.split('/claim-listing/')[1]), 'only the newest link works')
})

test('no link is made for a dead address or for a lead that has an email', async () => {
  const db = fakeDb([lead(), lead({ id: 'e', source_external_id: 'e', contact_email: 'host@example.com' })])
  await assert.rejects(prepareClaimLink(D(db), 'l1', 'http://localhost:3000'), /not a public https/)
  await assert.rejects(prepareClaimLink(D(db), 'e', 'https://wroomly.app'), /email outreach/)
  assert.equal(db.tables.listing_import_requests.length, 0, 'nothing was created')
})

test('the conversation log never keeps a claim link', () => {
  assert.equal(
    redactClaimLinks('Here you go: https://wroomly.app/claim-listing/AbC123-xyz_9 thanks'),
    'Here you go: [claim link] thanks',
  )
  assert.equal(redactClaimLinks('see wroomly.app'), 'see wroomly.app')
})
