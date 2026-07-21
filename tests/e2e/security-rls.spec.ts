import { test, expect } from '@playwright/test'
import {
  createTestUser,
  deleteTestUser,
  signInAsTestUser,
  type TestUser,
} from './helpers/supabase-admin'

/**
 * RLS / cross-user-access regression suite (security/audit, 2026-07-21).
 *
 * Proves — against the real database, as three separate signed-in users — that
 * one user cannot read or modify another user's data, and that the audit's
 * specific findings stay fixed:
 *   C1  an inquiry can actually be created (recursion regression)
 *   H1  a consumer CANNOT self-accept an inquiry (contact-PII harvest)
 *   M1  anon cannot read a hidden listing's images
 *   plus the core isolation matrix (profiles, listings, messages, favorites).
 *
 * These hit prod Supabase via PostgREST with each user's JWT — the same path a
 * browser client uses — so they exercise the actual RLS policies, not a mock.
 * Requires migration 038 applied; before it, C1/H1/M1 assertions fail (which is
 * exactly the point — they're the before/after proof).
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!

function rest(jwtOrKey: string, path: string, init: RequestInit = {}) {
  return fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${jwtOrKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
}
const svc = (path: string, init: RequestInit = {}) =>
  fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })

// Serial: these tests share state (the listing / inquiry / conversation built
// up in order) and hit auth rate limits if fanned across parallel workers.
test.describe.configure({ mode: 'serial' })

test.describe('RLS: no cross-user data access', () => {
  let A: TestUser // supplier
  let B: TestUser // consumer (inquires)
  let C: TestUser // unrelated consumer (the attacker)
  let aJwt: string, bJwt: string, cJwt: string
  let listingId: string, inquiryId: string, convId: string

  test.beforeAll(async () => {
    A = await createTestUser({ user_type: 'supplier' })
    B = await createTestUser({ user_type: 'consumer' })
    C = await createTestUser({ user_type: 'consumer' })
    aJwt = (await signInAsTestUser(A)).access_token
    bJwt = (await signInAsTestUser(B)).access_token
    cJwt = (await signInAsTestUser(C)).access_token

    // A lists a place (draft → activate via service role, as the app's review does)
    await rest(aJwt, 'listings', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        supplier_id: A.id, type: 'sublet', title: 'RLS test listing', description: 'x',
        status: 'draft', price_per_month: 100000, bedrooms: 1,
        available_from: '2027-01-01', available_to: '2027-05-01',
      }),
    })
    const lr = await (await svc(`listings?select=id&supplier_id=eq.${A.id}&order=created_at.desc&limit=1`)).json()
    listingId = lr[0].id
    await svc(`listings?id=eq.${listingId}`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) })
  })

  test.afterAll(async () => {
    if (listingId) await svc(`listings?id=eq.${listingId}`, { method: 'DELETE' })
    await deleteTestUser(A); await deleteTestUser(B); await deleteTestUser(C)
  })

  // ── C1: inquiries can be created (recursion regression) ────────────────────
  test('C1: a consumer can create an inquiry (no policy recursion)', async () => {
    const res = await rest(bJwt, 'inquiries', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ listing_id: listingId, consumer_id: B.id, message: 'B wants it' }),
    })
    expect(res.status, await res.text()).toBe(201)
    const rows = await (await svc(`inquiries?select=id,status&listing_id=eq.${listingId}&consumer_id=eq.${B.id}`)).json()
    expect(rows.length).toBe(1)
    inquiryId = rows[0].id
    expect(rows[0].status).toBe('pending')
    // build the conversation for later message tests (service role, as the app does)
    await svc('conversations', { method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ listing_id: listingId, supplier_id: A.id, consumer_id: B.id, inquiry_id: inquiryId }) })
    const cr = await (await svc(`conversations?select=id&inquiry_id=eq.${inquiryId}`)).json()
    convId = cr[0].id
    await svc('messages', { method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ conversation_id: convId, sender_id: B.id, content: 'SECRET_B_TO_A' }) })
  })

  // ── H1: consumer cannot self-accept (would harvest supplier contact PII) ────
  test('H1: a consumer CANNOT accept their own inquiry', async () => {
    const res = await rest(bJwt, `inquiries?id=eq.${inquiryId}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'accepted' }),
    })
    // whatever the HTTP code, the row must NOT be accepted
    const after = await (await svc(`inquiries?select=status&id=eq.${inquiryId}`)).json()
    expect(after[0].status, 'consumer must not be able to self-accept').not.toBe('accepted')
  })

  test('H1: the supplier CAN accept the inquiry (legit path still works)', async () => {
    await rest(aJwt, `inquiries?id=eq.${inquiryId}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'accepted' }),
    })
    const after = await (await svc(`inquiries?select=status&id=eq.${inquiryId}`)).json()
    expect(after[0].status).toBe('accepted')
  })

  test('H1: the consumer CAN still withdraw their own inquiry', async () => {
    // fresh pending inquiry from C on the same listing
    await rest(cJwt, 'inquiries', { method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ listing_id: listingId, consumer_id: C.id, message: 'C wants it' }) })
    const cq = await (await svc(`inquiries?select=id&consumer_id=eq.${C.id}&limit=1`)).json()
    const res = await rest(cJwt, `inquiries?id=eq.${cq[0].id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'withdrawn' }),
    })
    expect(res.status).toBe(204)
    const after = await (await svc(`inquiries?select=status&id=eq.${cq[0].id}`)).json()
    expect(after[0].status).toBe('withdrawn')
  })

  // ── Core isolation matrix ──────────────────────────────────────────────────
  test('C cannot read A or B private profile columns', async () => {
    const res = await rest(cJwt, `users?select=email,phone,stripe_account_id&id=eq.${A.id}`)
    // column grants deny email/phone/stripe to authenticated → 401/permission denied
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('@umich.edu')
  })

  test('C cannot self-escalate to admin/verified', async () => {
    await rest(cJwt, `users?id=eq.${C.id}`, { method: 'PATCH', body: JSON.stringify({ user_type: 'admin', is_verified: true }) })
    const after = await (await svc(`users?select=user_type,is_verified&id=eq.${C.id}`)).json()
    expect(after[0].user_type).toBe('consumer')
    expect(after[0].is_verified).toBe(false)
  })

  test('C cannot read the A↔B conversation or its messages', async () => {
    const conv = await (await rest(cJwt, `conversations?select=id&id=eq.${convId}`)).json()
    expect(conv).toEqual([])
    const msgs = await (await rest(cJwt, `messages?select=content&conversation_id=eq.${convId}`)).json()
    expect(JSON.stringify(msgs)).not.toContain('SECRET_B_TO_A')
  })

  test('C cannot inject or spoof a message into the A↔B conversation', async () => {
    await rest(cJwt, 'messages', { method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ conversation_id: convId, sender_id: C.id, content: 'INJECT' }) })
    await rest(cJwt, 'messages', { method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ conversation_id: convId, sender_id: B.id, content: 'SPOOF' }) })
    const n = (await (await svc(`messages?select=id&conversation_id=eq.${convId}`)).json()).length
    expect(n).toBe(1) // only the original SECRET_B_TO_A
  })

  test('C cannot read B favorites or saved searches', async () => {
    await rest(bJwt, 'favorites', { method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: B.id, listing_id: listingId }) })
    const favs = await (await rest(cJwt, `favorites?select=listing_id&user_id=eq.${B.id}`)).json()
    expect(favs).toEqual([])
  })

  test('M1: anon cannot read images of a non-active (archived) listing', async () => {
    // give the listing an image, then archive it
    await svc('listing_images', { method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ listing_id: listingId, storage_path: `${A.id}/${listingId}/0.jpeg`, display_order: 0 }) })
    await svc(`listings?id=eq.${listingId}`, { method: 'PATCH', body: JSON.stringify({ status: 'archived' }) })
    const imgs = await (await rest(ANON, `listing_images?select=storage_path&listing_id=eq.${listingId}`)).json()
    expect(imgs, 'archived listing images must be hidden from anon').toEqual([])
    // reactivate so afterAll cleanup is unaffected
    await svc(`listings?id=eq.${listingId}`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) })
  })

  test('C cannot update or delete A listing', async () => {
    await rest(cJwt, `listings?id=eq.${listingId}`, { method: 'PATCH', body: JSON.stringify({ price_per_month: 1 }) })
    await rest(cJwt, `listings?id=eq.${listingId}`, { method: 'DELETE' })
    const l = await (await svc(`listings?select=price_per_month&id=eq.${listingId}`)).json()
    expect(l.length).toBe(1)
    expect(l[0].price_per_month).toBe(100000)
  })
})
