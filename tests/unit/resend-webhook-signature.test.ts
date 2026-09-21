import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, randomBytes } from 'node:crypto'
import { verifyResendWebhook } from '../../src/lib/resend.ts'

/**
 * Signature verification is what stops a stranger who learns the webhook URL
 * from POSTing a forged "bounce" and silently suppressing any address they
 * like — a quiet way to switch outreach off.
 *
 * Production verifies with Resend's own library. These tests sign by hand,
 * straight from the Svix spec (HMAC-SHA256 over `id.timestamp.body`, base64,
 * secret base64-decoded after the `whsec_` prefix). Two independent
 * implementations agreeing is the point: a test that reused the library to
 * sign would pass even if both sides were wrong in the same way.
 */

const SECRET_BYTES = randomBytes(24).toString('base64')
const SECRET = `whsec_${SECRET_BYTES}`

function sign(id: string, timestamp: string, payload: string, secret = SECRET_BYTES) {
  const mac = createHmac('sha256', Buffer.from(secret, 'base64'))
  mac.update(`${id}.${timestamp}.${payload}`)
  return `v1,${mac.digest('base64')}`
}

const now = () => Math.floor(Date.now() / 1000).toString()
const body = JSON.stringify({
  type: 'email.bounced',
  created_at: '2026-09-21T00:00:00Z',
  data: { email_id: 'e1', to: ['dead@umich.edu'], bounce: { type: 'Permanent' } },
})

test('accepts a correctly signed payload and returns the parsed event', () => {
  const id = 'msg_test123'
  const ts = now()
  const event = verifyResendWebhook({
    payload: body,
    headers: { id, timestamp: ts, signature: sign(id, ts, body) },
    secret: SECRET,
  })
  assert.equal((event as { type: string }).type, 'email.bounced')
})

test('REJECTS a tampered body — the signature covers the bytes, not just the headers', () => {
  const id = 'msg_test123'
  const ts = now()
  const signature = sign(id, ts, body)
  const tampered = body.replace('dead@umich.edu', 'someone-else@umich.edu')

  assert.throws(() =>
    verifyResendWebhook({ payload: tampered, headers: { id, timestamp: ts, signature }, secret: SECRET }),
  )
})

test('REJECTS a signature made with a different secret', () => {
  const id = 'msg_test123'
  const ts = now()
  const wrong = randomBytes(24).toString('base64')
  assert.throws(() =>
    verifyResendWebhook({
      payload: body,
      headers: { id, timestamp: ts, signature: sign(id, ts, body, wrong) },
      secret: SECRET,
    }),
  )
})

test('REJECTS a replayed timestamp outside the tolerance window', () => {
  const id = 'msg_test123'
  const old = (Math.floor(Date.now() / 1000) - 60 * 60).toString()
  assert.throws(() =>
    verifyResendWebhook({
      payload: body,
      headers: { id, timestamp: old, signature: sign(id, old, body) },
      secret: SECRET,
    }),
  )
})

test('REJECTS a signature bound to a different message id', () => {
  const ts = now()
  const signature = sign('msg_other', ts, body)
  assert.throws(() =>
    verifyResendWebhook({
      payload: body,
      headers: { id: 'msg_test123', timestamp: ts, signature },
      secret: SECRET,
    }),
  )
})

test('REJECTS empty or malformed signature headers', () => {
  const id = 'msg_test123'
  const ts = now()
  for (const signature of ['', 'garbage', 'v1,', 'v2,abc']) {
    assert.throws(
      () => verifyResendWebhook({ payload: body, headers: { id, timestamp: ts, signature }, secret: SECRET }),
      `should reject ${JSON.stringify(signature)}`,
    )
  }
})

test('accepts when the header carries several signatures and one of them matches', () => {
  const id = 'msg_test123'
  const ts = now()
  const decoy = sign(id, ts, body, randomBytes(24).toString('base64'))
  const real = sign(id, ts, body)
  const event = verifyResendWebhook({
    payload: body,
    headers: { id, timestamp: ts, signature: `${decoy} ${real}` },
    secret: SECRET,
  })
  assert.equal((event as { type: string }).type, 'email.bounced')
})
