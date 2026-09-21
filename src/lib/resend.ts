import { Resend } from 'resend'
import type { WebhookEventPayload } from 'resend'

// Lazy-init via Proxy. NOTE: resend v6's constructor DOES throw on a missing
// key ("Missing API key…"), verified 2026-09-21 — an older comment here
// claimed otherwise. That makes the laziness load-bearing rather than
// stylistic: building the client at module scope would throw during import
// and take down every route that touches this file, instead of surfacing an
// actionable error in the catch block of whoever actually sends.
let _client: Resend | null = null
function getResend(): Resend {
  if (_client) return _client
  const key = process.env.RESEND_API_KEY
  if (!key || key === 'your_resend_api_key') {
    throw new Error(
      'RESEND_API_KEY is not set — email notifications unavailable',
    )
  }
  _client = new Resend(key)
  return _client
}

export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    return Reflect.get(getResend(), prop)
  },
})

// From address — must match a verified domain in Resend. We use
// `notifications@wroomly.app` (the existing prod domain) once DNS is
// verified. Until then, the SDK will reject sends to anything other
// than the verified address with a clear error.
export const FROM_EMAIL = 'Wroomly <notifications@wroomly.app>'

/**
 * Verify an inbound Resend webhook and return its parsed event.
 *
 * Deliberately does NOT go through the `resend` proxy above: signature
 * verification needs the WEBHOOK secret, never the API key, and routing it
 * through the proxy would make a webhook fail with "RESEND_API_KEY is not
 * set" on any environment that only receives mail events. This client is
 * constructed without a key on purpose — `verify` does pure local crypto
 * (Svix HMAC) and makes no API call.
 *
 * Throws when the signature, secret, or timestamp is wrong. Callers must
 * treat a throw as "reject the request", never as "process it anyway".
 */
// Same reason the client above is lazy: `new Resend()` throws without a key.
// `verify` is pure local crypto (Svix HMAC) and makes no API call, so the key
// it is handed is irrelevant — but one must be present for the constructor.
// Built on first use so importing this module can never throw.
let _verifier: Resend | null = null
function getVerifier(): Resend {
  if (!_verifier) _verifier = new Resend(process.env.RESEND_API_KEY || 're_unused_for_verification')
  return _verifier
}

export function verifyResendWebhook(opts: {
  payload: string
  headers: { id: string; timestamp: string; signature: string }
  secret: string
}): WebhookEventPayload {
  return getVerifier().webhooks.verify({
    payload: opts.payload,
    headers: opts.headers,
    webhookSecret: opts.secret,
  })
}
