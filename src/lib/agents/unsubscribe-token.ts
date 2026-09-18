import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Unsubscribe links must work on the first click, from an email client, with no
 * login and no lookup. So the token is an HMAC of the address itself rather than
 * a stored random value: it cannot be forged without the secret, and it cannot
 * be used to opt somebody ELSE out, because the address travels with it and must
 * match the signature.
 */

function secret(): string {
  const s = process.env.OUTREACH_SECRET
  if (!s || s.length < 32) {
    throw new Error('OUTREACH_SECRET must be set to a random string of 32+ chars')
  }
  return s
}

export function signUnsubscribe(email: string, key: string = secret()): string {
  return createHmac('sha256', key).update(email.trim().toLowerCase()).digest('base64url')
}

/** Constant-time compare, so the token can't be guessed byte-by-byte. */
export function verifyUnsubscribe(email: string, token: string, key: string = secret()): boolean {
  const expected = Buffer.from(signUnsubscribe(email, key))
  const got = Buffer.from(token || '')
  return expected.length === got.length && timingSafeEqual(expected, got)
}

export function unsubscribeUrl(email: string, origin = 'https://wroomly.app'): string {
  const qs = new URLSearchParams({ email: email.trim().toLowerCase(), t: signUnsubscribe(email) })
  return `${origin}/api/outreach/unsubscribe?${qs}`
}
