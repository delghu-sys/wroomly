import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'

/**
 * File a report against a listing, user, or message thread.
 *
 * Inserts under the caller's own session (the existing "Users can create
 * reports" RLS policy), then emails the admin inbox. The email is
 * best-effort: a mail failure never loses the report, which is already in
 * the table the admin console reads.
 */

const REASONS = [
  'Scam or fraud',
  'Discriminatory language',
  "Listing isn't real or uses stolen photos",
  'Harassment',
  'Spam',
  'Other',
] as const

const TARGET_TYPES = ['listing', 'user', 'message'] as const

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: {
    targetType?: string
    targetId?: string
    reason?: string
    detail?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const targetType = TARGET_TYPES.find(t => t === body.targetType)
  const reason = REASONS.find(r => r === body.reason)
  const targetId = body.targetId ?? ''
  const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!targetType || !reason || !uuidRx.test(targetId)) {
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 })
  }
  const detail = (body.detail ?? '').trim().slice(0, 2000) || null

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason,
    detail,
  })
  if (error) {
    // Deploy-order safety: if the `detail` column (migration 039) isn't
    // applied yet, retry without it rather than dropping the report.
    const { error: retryErr } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: detail ? `${reason} — ${detail}` : reason,
    })
    if (retryErr) {
      console.error('[reports] insert failed:', retryErr.message)
      return NextResponse.json({ error: 'Could not submit report' }, { status: 500 })
    }
  }

  // Notify the admin inbox. Uses the real contact address until dedicated
  // mailboxes (safety@) exist.
  try {
    await sendEmail({
      to: 'delghu@umich.edu',
      subject: `[Wroomly report] ${reason} — ${targetType}`,
      html: `<p>New ${targetType} report from user ${user.id}.</p>
<p><strong>Reason:</strong> ${reason}</p>
${detail ? `<p><strong>Detail:</strong> ${detail.replace(/</g, '&lt;')}</p>` : ''}
<p><strong>Target:</strong> ${targetType}:${targetId}</p>
<p>Review it in the admin console: https://wroomly.app/admin/reports</p>`,
      text: `New ${targetType} report. Reason: ${reason}. ${detail ? `Detail: ${detail}. ` : ''}Target: ${targetType}:${targetId}`,
    })
  } catch (e) {
    console.error('[reports] notification email failed:', e)
  }

  return NextResponse.json({ ok: true })
}
