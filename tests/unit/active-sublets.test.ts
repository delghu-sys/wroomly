import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeActiveSublets, type SubletLead } from '../../src/lib/agents/active-sublets.ts'
import { readBoardStatus, refreshListingStatuses } from '../../src/lib/agents/sources/offcampus-universe.ts'

/**
 * "Active" is Hugo's definition: the board says it is available AND its dates
 * have not expired. These cases are the real shapes measured on the board on
 * 2026-10-11, where 14 of 71 sublets were active.
 */
const NOW = new Date('2026-10-11T12:00:00Z')

const lead = (over: Partial<SubletLead> & { extracted?: Record<string, unknown> } = {}): SubletLead => ({
  status: 'drafted',
  skip_reason: null,
  outreach_sent_at: null,
  extracted: { dates: 'January to August 2027', postedAt: '2026-09-18T00:00:00Z', boardStatus: 'Available' },
  ...over,
})

test('an available sublet with a future end date is active and CONFIRMED', () => {
  const s = summarizeActiveSublets([lead()], NOW)
  assert.equal(s.active, 1)
  assert.equal(s.confirmed, 1)
})

test('a sublet whose dates have passed is expired, not active', () => {
  const s = summarizeActiveSublets(
    [lead({ extracted: { dates: 'January to August 2026', postedAt: '2026-01-05T00:00:00Z', boardStatus: 'Available' } })],
    NOW,
  )
  assert.equal(s.active, 0)
  assert.equal(s.expired, 1)
})

test('the board saying RENTED excludes it even when the dates are fine', () => {
  const s = summarizeActiveSublets([lead({ extracted: { dates: 'Jan to Aug 2027', postedAt: '2026-09-18T00:00:00Z', boardStatus: 'Rented' } })], NOW)
  assert.equal(s.active, 0)
  assert.equal(s.rented, 1)
})

test('year leases are never counted as sublets', () => {
  const s = summarizeActiveSublets([lead({ skip_reason: 'not a sublet (Year Lease (12 Months))' })], NOW)
  assert.equal(s.notSublets, 1)
  assert.equal(s.sublets, 0)
  assert.equal(s.active, 0)
})

test('no end date + a RECENT post is "likely" active', () => {
  // Hub William: posted Sep 3, "December", no end given.
  const s = summarizeActiveSublets(
    [lead({ extracted: { dates: 'December', postedAt: '2026-09-03T00:00:00Z', boardStatus: 'Available' } })],
    NOW,
  )
  assert.equal(s.active, 1)
  assert.equal(s.likely, 1)
  assert.equal(s.confirmed, 0)
})

test('no end date + an OLD post is counted active but flagged probably stale', () => {
  // university trails: posted Feb, start passed, no end. Active by the stated
  // definition, but nobody should be told it is a sure thing.
  const s = summarizeActiveSublets(
    [lead({ extracted: { dates: 'march 2026', postedAt: '2026-02-21T00:00:00Z', boardStatus: 'Available' } })],
    NOW,
  )
  assert.equal(s.active, 1)
  assert.equal(s.probablyStale, 1)
})

test('confirmed + likely + probably-stale always add up to active', () => {
  const s = summarizeActiveSublets(
    [
      lead(),
      lead({ extracted: { dates: 'December', postedAt: '2026-09-03T00:00:00Z', boardStatus: 'Available' } }),
      lead({ extracted: { dates: 'march 2026', postedAt: '2026-02-21T00:00:00Z', boardStatus: 'Available' } }),
    ],
    NOW,
  )
  assert.equal(s.confirmed + s.likely + s.probablyStale, s.active)
  assert.equal(s.active, 3)
})

test('a listing whose status was never read still counts, and says so', () => {
  const s = summarizeActiveSublets([lead({ extracted: { dates: 'Jan to Aug 2027', postedAt: '2026-09-18T00:00:00Z' } })], NOW)
  assert.equal(s.active, 1)
  assert.equal(s.statusUnchecked, 1, 'so the card can show the count is not fully verified')
})

test('emailed and ready-to-email are counted among the active ones only', () => {
  const s = summarizeActiveSublets(
    [
      lead({ outreach_sent_at: '2026-10-01T23:12:00Z', status: 'contacted' }),
      lead({ status: 'drafted' }),
      lead({ status: 'skipped', skip_reason: 'older than the current season' }),
      // expired and emailed: must NOT inflate the active-emailed count
      lead({ outreach_sent_at: '2026-10-01T00:00:00Z', extracted: { dates: 'May to Aug 2025', postedAt: '2025-04-01T00:00:00Z' } }),
    ],
    NOW,
  )
  assert.equal(s.active, 3)
  assert.equal(s.emailed, 1)
  assert.equal(s.readyToEmail, 1)
})

test('posted-in-the-last-30-days counts sublets, whatever their state', () => {
  const s = summarizeActiveSublets(
    [
      lead({ extracted: { dates: 'Jan to Aug 2027', postedAt: '2026-10-10T00:00:00Z', boardStatus: 'Available' } }),
      lead({ extracted: { dates: 'Jan to Aug 2027', postedAt: '2026-08-01T00:00:00Z', boardStatus: 'Available' } }),
      lead({ skip_reason: 'not a sublet (x)', extracted: { postedAt: '2026-10-10T00:00:00Z' } }),
    ],
    NOW,
  )
  assert.equal(s.postedLast30Days, 1, 'one recent sublet; the year lease is not a sublet')
})

test('lastCheckedAt is the newest time a status was read, or null', () => {
  assert.equal(summarizeActiveSublets([lead()], NOW).lastCheckedAt, null)
  const s = summarizeActiveSublets(
    [
      lead({ extracted: { dates: 'Jan to Aug 2027', postedAt: '2026-09-18T00:00:00Z', boardStatus: 'Available', boardStatusAt: '2026-10-10T08:00:00Z' } }),
      lead({ extracted: { dates: 'Jan to Aug 2027', postedAt: '2026-09-18T00:00:00Z', boardStatus: 'Available', boardStatusAt: '2026-10-11T09:30:00Z' } }),
    ],
    NOW,
  )
  assert.equal(s.lastCheckedAt, '2026-10-11T09:30:00Z')
})

test('an empty queue is all zeros, not a crash', () => {
  const s = summarizeActiveSublets([], NOW)
  assert.equal(s.active, 0)
  assert.equal(s.lastCheckedAt, null)
})

// ── the adapter half: reading the board's status ───────────────────────────

test('reads the board status from a record, and ignores a bad shape', () => {
  assert.equal(readBoardStatus('{"price":900,"status":"Available","x":1}'), 'Available')
  assert.equal(readBoardStatus('{"status":"Rented"}'), 'Rented')
  assert.equal(readBoardStatus('{"price":900}'), undefined, 'absent is unknown, not a value')
  assert.equal(readBoardStatus('{"status":123}'), undefined)
})

const page = (id: string, status: string) =>
  `<html>\\"recordsByCollectionId\\":{\\"ApartmentListings\\":{\\"${id}\\":{\\"typeOfLease\\":\\"Sub Lease\\",\\"status\\":\\"${status}\\"}}}</html>`

const SITEMAP = `<urlset>
  <url><loc>https://www.offcampus-universe.com/university/university-of-michigan/apartment-listings/a</loc></url>
  <url><loc>https://www.offcampus-universe.com/university/university-of-michigan/apartment-listings/b</loc></url>
  <url><loc>https://www.offcampus-universe.com/university/university-of-michigan/apartment-listings/c</loc></url>
</urlset>`

function fakeSite(pages: Record<string, string>, fetched: string[] = []) {
  return async (url: string) => {
    fetched.push(url)
    if (url.includes('sitemap')) return SITEMAP
    const id = url.split('/').pop() as string
    if (!(id in pages)) throw new Error('404')
    return page(id, pages[id])
  }
}

test('refresh reads ONLY the listings asked for, not the whole site', async () => {
  const fetched: string[] = []
  const r = await refreshListingStatuses(['a', 'b'], new Set(['a', 'b']), {
    fetchImpl: fakeSite({ a: 'Available', b: 'Rented', c: 'Available' }, fetched),
  })
  assert.deepEqual([...r.statuses.entries()].sort(), [['a', 'Available'], ['b', 'Rented']])
  assert.equal(fetched.filter(u => !u.includes('sitemap')).length, 2, 'listing c was never fetched')
})

test('refresh reports how many listings are on the site and how many are new', async () => {
  const r = await refreshListingStatuses(['a'], new Set(['a', 'b']), { fetchImpl: fakeSite({ a: 'Available' }) })
  assert.equal(r.onSite, 3)
  assert.equal(r.unseen, 1, 'c is on the site and we have never looked at it')
})

test('a page that fails to load is counted unread, never guessed', async () => {
  const r = await refreshListingStatuses(['a', 'b'], new Set(['a', 'b']), { fetchImpl: fakeSite({ a: 'Available' }) })
  assert.equal(r.statuses.has('b'), false)
  assert.equal(r.unread, 1)
})

test('refresh stops at its page cap and says how many it left', async () => {
  const r = await refreshListingStatuses(['a', 'b', 'c'], new Set(['a', 'b', 'c']), {
    maxPages: 1,
    fetchImpl: fakeSite({ a: 'Available', b: 'Available', c: 'Available' }),
  })
  assert.equal(r.statuses.size, 1)
  assert.equal(r.unread, 2)
})
