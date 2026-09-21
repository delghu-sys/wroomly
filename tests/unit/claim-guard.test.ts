import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ensureClaimedBy } from '../../src/lib/listing-import/claim-guard.ts'

/**
 * Claiming binds a draft to one account permanently: a second account gets a
 * 403 forever after. That makes WHO claims, and WHEN, security-relevant —
 * which is why viewing must never claim, and why the write is a
 * compare-and-set rather than a blind update.
 */

const ME = 'user-me'
const THEM = 'user-them'

/** `updated` is how many rows the CAS update reports; `freshOwner` is who
 *  holds the draft when we re-read after losing that race. */
function fakeDb({ updated = 1, freshOwner = null as string | null, failUpdate = false }) {
  const writes: Record<string, unknown>[] = []
  const db = {
    from() {
      const chain = {
        update: (patch: Record<string, unknown>) => {
          writes.push(patch)
          return chain
        },
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        maybeSingle: () => Promise.resolve({ data: { claimed_by_user_id: freshOwner }, error: null }),
        then: (resolve: (v: unknown) => void) =>
          resolve(
            failUpdate
              ? { data: null, error: { message: 'boom' } }
              : { data: Array.from({ length: updated }, () => ({ id: 'req-1' })), error: null },
          ),
      }
      return chain
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { db, writes }
}

test('a draft already owned by this user needs no write at all', async () => {
  const { db, writes } = fakeDb({})
  const r = await ensureClaimedBy(db, { id: 'req-1', claimed_by_user_id: ME }, ME)
  assert.deepEqual(r, { ok: true, claimedNow: false })
  assert.deepEqual(writes, [], 'viewing your own draft repeatedly must not rewrite the row')
})

test('an unclaimed draft is claimed by the user taking the action', async () => {
  const { db, writes } = fakeDb({ updated: 1 })
  const r = await ensureClaimedBy(db, { id: 'req-1', claimed_by_user_id: null }, ME)
  assert.deepEqual(r, { ok: true, claimedNow: true })
  assert.equal(writes.length, 1)
  assert.equal(writes[0].claimed_by_user_id, ME)
  assert.ok(typeof writes[0].claimed_at === 'string', 'claimed_at is stamped')
})

test('a draft owned by someone else is refused, and never overwritten', async () => {
  const { db, writes } = fakeDb({})
  const r = await ensureClaimedBy(db, { id: 'req-1', claimed_by_user_id: THEM }, ME)
  assert.deepEqual(r, { ok: false, status: 403, error: 'You don’t have access to this draft.' })
  assert.deepEqual(writes, [], "another account's claim is never clobbered")
})

test('losing the claim race to another account yields 403, not a silent takeover', async () => {
  // The CAS update matched 0 rows because someone claimed between read + write.
  const { db } = fakeDb({ updated: 0, freshOwner: THEM })
  const r = await ensureClaimedBy(db, { id: 'req-1', claimed_by_user_id: null }, ME)
  assert.equal(r.ok, false)
  assert.equal(r.ok === false && r.status, 403)
})

test('losing the race to YOURSELF (two tabs) still succeeds', async () => {
  const { db } = fakeDb({ updated: 0, freshOwner: ME })
  const r = await ensureClaimedBy(db, { id: 'req-1', claimed_by_user_id: null }, ME)
  assert.deepEqual(r, { ok: true, claimedNow: true })
})

test('a database failure is a 500, never treated as a successful claim', async () => {
  const { db } = fakeDb({ failUpdate: true })
  const r = await ensureClaimedBy(db, { id: 'req-1', claimed_by_user_id: null }, ME)
  assert.equal(r.ok, false)
  assert.equal(r.ok === false && r.status, 500)
})
