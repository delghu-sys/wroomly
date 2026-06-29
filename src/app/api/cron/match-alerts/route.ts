import { NextResponse } from 'next/server'
import { runMatchAlerts } from '@/lib/match/dispatch'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/cron/match-alerts
 *
 * Daily Vercel Cron (see vercel.json). Sends 'daily'-frequency Wroomly Match
 * digests and doubles as a catch-up safety net for any 'instant' match whose
 * send failed at activation time. Deduping (match_alert_sends) makes the
 * already-sent instant alerts no-ops here.
 *
 * Auth mirrors the saved-search-alerts cron: Vercel injects
 * `Authorization: Bearer $CRON_SECRET`. Fail closed if the secret is unset.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { processed, emailed } = await runMatchAlerts()
  return NextResponse.json({ ok: true, processed, emailed })
}
