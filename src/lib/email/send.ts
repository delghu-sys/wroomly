import 'server-only'
import { resend, FROM_EMAIL } from '@/lib/resend'

/**
 * Email sender wrapper that never throws.
 *
 * Every caller is inside a critical flow (inquiry create, accept,
 * payment success). We don't want a Resend outage or a missing API key
 * to break the actual booking — emails are a nice-to-have on top of the
 * UI state changes that already happened.
 *
 * Returns { ok, error } so callers can log if they want. Console-errors
 * land in Vercel logs + Sentry automatically.
 */
export async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
  text?: string // plaintext fallback for clients that don't render HTML
  replyTo?: string
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
    })

    if (result.error) {
      console.error('[email] resend rejected send', {
        to: opts.to,
        subject: opts.subject,
        error: result.error,
      })
      return { ok: false, error: result.error.message }
    }

    return { ok: true, id: result.data?.id }
  } catch (err) {
    // Network error, missing API key, etc. Don't let this kill the
    // calling flow — the booking / inquiry has already happened.
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] threw during send', {
      to: opts.to,
      subject: opts.subject,
      error: message,
    })
    return { ok: false, error: message }
  }
}
