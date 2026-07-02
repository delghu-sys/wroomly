import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAlertByToken, updateAlertByToken } from '@/lib/match/alerts'
import { humanizeProfile, normalizeProfile, resolveProfile } from '@/lib/match/profile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET  /api/match/alerts/[token]  — fetch the alert behind a manage token.
 * PATCH /api/match/alerts/[token] — edit the weighted profile, change
 *                                   frequency, pause / resume, or unsubscribe.
 *
 * The token is the sole credential (no login). We never expose other alerts.
 */
function publicView(alert: NonNullable<Awaited<ReturnType<typeof getAlertByToken>>>) {
  const profile = resolveProfile(alert.profile, alert.criteria)
  return {
    email: alert.email,
    profile,
    tags: humanizeProfile(profile),
    status: alert.status,
    frequency: alert.frequency,
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const alert = await getAlertByToken(token)
  if (!alert) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(publicView(alert))
}

const patchSchema = z.object({
  profile: z.unknown().optional(),
  frequency: z.enum(['instant', 'daily']).optional(),
  status: z.enum(['active', 'paused', 'unsubscribed']).optional(),
})

export async function PATCH(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const updated = await updateAlertByToken(token, {
    ...(body.profile !== undefined ? { profile: normalizeProfile(body.profile) } : {}),
    ...(body.frequency !== undefined ? { frequency: body.frequency } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
  })

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true, ...publicView(updated) })
}
