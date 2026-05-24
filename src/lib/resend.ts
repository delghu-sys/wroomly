import { Resend } from 'resend'

// Lazy-init via Proxy: the Resend SDK constructor doesn't throw with
// an undefined key (it just stores it and fails on first send), but
// we still want one consistent pattern across SDK clients (matches
// stripe.ts + listing-reviewer.ts). The real client is only built
// the first time someone *uses* it, and a missing key surfaces as an
// actionable runtime error in the catch block of whoever calls send.
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
