import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canResumeDraft, canRefreshLink, escapeLike, sameEmail } from '../../src/lib/listing-import/waiting-drafts.ts'

const ME = { id: 'u-me', email: 'Sam@UMich.edu' }
const base = { status: 'completed', listing_id: null, email: 'sam@umich.edu', claimed_by_user_id: null }

test('the owner, signed in with the import address, can resume an unclaimed draft', () => {
  assert.equal(canResumeDraft(base, ME), true, 'case and spaces do not matter')
  assert.equal(sameEmail(' a@b.co ', 'A@B.CO'), true)
})

test('nobody else can resume it', () => {
  assert.equal(canResumeDraft(base, { id: 'u-other', email: 'other@umich.edu' }), false)
  assert.equal(canResumeDraft({ ...base, email: null }, ME), false, 'no address on the draft → no email match')
  assert.equal(canResumeDraft(base, { id: 'u-me', email: null }), false)
})

test('a draft held by an account belongs to that account only, whatever the address', () => {
  assert.equal(canResumeDraft({ ...base, claimed_by_user_id: 'u-me', email: 'old@yahoo.com' }, ME), true)
  assert.equal(canResumeDraft({ ...base, claimed_by_user_id: 'u-other' }, ME), false, 'same address, other holder')
})

test('published, pending or rejected drafts are not offered', () => {
  assert.equal(canResumeDraft({ ...base, listing_id: 'l1' }, ME), false)
  assert.equal(canResumeDraft({ ...base, status: 'awaiting_admin_review' }, ME), false)
  assert.equal(canResumeDraft({ ...base, status: 'rejected' }, ME), false)
})

test('a fresh link is only minted for an expired, unfinished draft with an address', () => {
  const now = new Date('2026-11-10T12:00:00Z')
  const expired = { ...base, claim_token_expires_at: '2026-11-01T00:00:00Z' }
  assert.equal(canRefreshLink(expired, now), true)
  assert.equal(canRefreshLink({ ...expired, claim_token_expires_at: '2026-11-15T00:00:00Z' }, now), false, 'still valid: no spam via repeated clicks')
  assert.equal(canRefreshLink({ ...expired, listing_id: 'l1' }, now), false)
  assert.equal(canRefreshLink({ ...expired, email: null }, now), false)
})

test('LIKE wildcards in an address are escaped', () => {
  assert.equal(escapeLike('a_b%c\\d@x.com'), 'a\\_b\\%c\\\\d@x.com')
})
