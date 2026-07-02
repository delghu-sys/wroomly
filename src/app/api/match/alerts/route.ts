import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createOrUpdateAlert, addToWaitlist } from '@/lib/match/alerts'
import { normalizeProfile, humanizeProfile } from '@/lib/match/profile'
import { sendEmail } from '@/lib/email/send'
import { matchWelcomeEmail, unsubscribeUrl } from '@/lib/email/match-template'
import { allowMatchRequest, ALERT_LIMITS } from '@/lib/match/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/match/alerts
 *
 * Creates (or refreshes) a Wroomly Match alert from the concierge chat's
 * weighted profile. Single opt-in: the renter typed their own email, so it
 * activates immediately and we send a welcome email with manage + unsubscribe
 * links. The opt-in also joins the renter launch list.
 *
 * Public + anonymous. The returned manage token lets the renter edit/
 * unsubscribe without an account.
 */
const bodySchema = z.object({
  email: z.string().email().max(200),
  // Validated loosely here; normalizeProfile is the real guard.
  profile: z.unknown(),
  transcript: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      }),
    )
    .max(60)
    .optional()
    .default([]),
  frequency: z.enum(['instant', 'daily']).optional(),
})

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // This endpoint emails a caller-supplied address, so it's an email-bomb / spam
  // vector if left uncapped. Cap per target email (a victim can't be hit
  // repeatedly) and globally (bounds total send volume). Keyed on the
  // normalized email so casing/whitespace can't bypass the per-address cap.
  const emailKey = body.email.trim().toLowerCase()
  if (!(await allowMatchRequest({ bucket: 'alerts', identifier: emailKey }, ALERT_LIMITS))) {
    return NextResponse.json(
      { error: 'Too many requests for this email. Please try again later.' },
      { status: 429 },
    )
  }

  const profile = normalizeProfile(body.profile)

  let alert
  try {
    const res = await createOrUpdateAlert({
      email: body.email,
      profile,
      transcript: body.transcript,
      frequency: body.frequency,
      source: 'match_page',
    })
    alert = res.alert
  } catch (err) {
    console.error('[match/alerts] create failed', err)
    return NextResponse.json(
      { error: 'Could not save your alert. Please try again.' },
      { status: 500 },
    )
  }

  // Opt-in doubles as joining the launch list (best-effort, non-blocking).
  await addToWaitlist(body.email, 'match')

  // Welcome / confirmation email (fire-and-forget — the alert is already saved).
  const tags = humanizeProfile(profile)
  void (async () => {
    const { subject, html } = matchWelcomeEmail({
      tags,
      summary: profile.summary,
      token: alert.manage_token,
    })
    await sendEmail({
      to: alert.email,
      subject,
      html,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl(alert.manage_token)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
  })()

  return NextResponse.json({ ok: true, token: alert.manage_token, tags })
}
