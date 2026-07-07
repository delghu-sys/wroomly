import { createServiceClient } from '@/lib/supabase/server'
import { getAlertByToken } from '@/lib/match/alerts'
import { applyFeedbackNudge } from '@/lib/match/feedback'
import { resolveProfile } from '@/lib/match/profile'
import { manageUrl } from '@/lib/email/match-template'
import type { MatchAlertSend, MatchFeedback } from '@/types/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/match/feedback?token=…&send=…&v=up|down
 *
 * The 👍/👎 links in every match email land here (GET because email clients).
 * Records the reaction on the send row and nudges the alert's profile weights
 * so future matches sharpen (see lib/match/feedback.ts for the model).
 *
 * Auth is the manage token — the same credential as the manage page — plus a
 * check that the send row actually belongs to that alert. Repeat clicks on the
 * same thumb are idempotent (no double-nudging); switching thumbs re-records
 * and applies the new direction's nudge once.
 *
 * Responds with a tiny branded page: acknowledge, offer the manage link.
 */

function page(opts: { title: string; body: string; manageHref?: string }): Response {
  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${opts.title} · Wroomly Match</title></head>
<body style="margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0E2A47;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:26rem;margin:2rem;padding:2.5rem 2rem;background:#fff;border-radius:24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
<img src="/logo.png" alt="Wroomly" width="40" height="40" style="border-radius:10px;margin-bottom:1.25rem;" />
<h1 style="margin:0 0 0.75rem;font-size:1.35rem;letter-spacing:-0.02em;color:#0E2A47;">${opts.title}</h1>
<p style="margin:0 0 1.5rem;font-size:0.925rem;line-height:1.6;color:#4a5666;">${opts.body}</p>
${
  opts.manageHref
    ? `<a href="${opts.manageHref}" style="display:inline-block;background:#F5B82E;color:#0E2A47;font-size:0.875rem;font-weight:700;text-decoration:none;padding:0.75rem 1.5rem;border-radius:999px;">Manage my matches</a>`
    : ''
}
</div></body></html>`
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') ?? ''
  const sendId = url.searchParams.get('send') ?? ''
  const v = url.searchParams.get('v')

  if (!token || !sendId || (v !== 'up' && v !== 'down')) {
    return page({
      title: 'That link looks off',
      body: 'This feedback link is incomplete or expired. You can manage your matches from any Wroomly Match email.',
    })
  }
  const feedback: MatchFeedback = v

  const alert = await getAlertByToken(token)
  if (!alert) {
    return page({
      title: 'That link looks off',
      body: 'We couldn’t find a match alert for this link. It may have been removed.',
    })
  }

  const service = createServiceClient()
  const { data: sendRow } = await service
    .from('match_alert_sends')
    .select('*')
    .eq('id', sendId)
    .eq('alert_id', alert.id)
    .maybeSingle()
  const send = sendRow as MatchAlertSend | null
  if (!send) {
    return page({
      title: 'That link looks off',
      body: 'We couldn’t find that match. It may belong to a different alert.',
      manageHref: manageUrl(token),
    })
  }

  const thanks =
    feedback === 'up'
      ? {
          title: 'Good to know — thanks',
          body: 'We’ve marked this one a hit and tuned your matches toward more like it.',
        }
      : {
          title: 'Got it — not for you',
          body: 'We’ve noted the miss and adjusted what we watch for. Your next matches should be sharper.',
        }

  // Repeat click on the same thumb → acknowledge without double-nudging.
  if (send.feedback === feedback) {
    return page({ ...thanks, manageHref: manageUrl(token) })
  }

  await service
    .from('match_alert_sends')
    .update({ feedback, feedback_at: new Date().toISOString() })
    .eq('id', send.id)

  // Funnel event — the email click has no client JS to call src/lib/track.ts,
  // so record it directly in the same shape /api/events writes. Best-effort.
  void service
    .from('analytics_events')
    .insert({ name: 'match_feedback_given', props: { v: feedback } })
    .then(({ error }) => {
      if (error) console.warn('[match/feedback] event insert failed:', error.message)
    })

  // Nudge the profile weights from this send's recorded fit/miss reasons.
  try {
    const profile = resolveProfile(alert.profile, alert.criteria)
    const nudged = applyFeedbackNudge(profile, send.reasons ?? [], feedback)
    await service
      .from('match_alerts')
      .update({ profile: nudged })
      .eq('id', alert.id)
  } catch (err) {
    // Feedback is recorded either way; a failed nudge must not break the page.
    console.error('[match/feedback] weight nudge failed', { sendId: send.id, err })
  }

  return page({ ...thanks, manageHref: manageUrl(token) })
}
