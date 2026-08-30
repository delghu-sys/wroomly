import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkFairHousing } from '@/lib/fairHousing'

/**
 * Fair-housing flag logger — the tuning feedback loop for the listing-form
 * guardrail (warn-not-block; see src/lib/fairHousing.ts).
 *
 * The client sends the TEXT, not the verdict: the matcher re-runs here so a
 * row is only written for text that actually matches server-side. Two moments
 * log: when a warning is first shown (submitted_with_match null), and at
 * submit (true = they shipped it anyway, false = the warning taught them to
 * edit). Logging failures return ok — this must never break listing creation.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: { text?: string; field?: string; phase?: string; shownPhrase?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const field = body.field === 'title' ? 'title' : 'description'
  const match = checkFairHousing((body.text ?? '').slice(0, 20000))

  const service = createServiceClient()
  if (body.phase === 'submit') {
    // At submit: either it still matches (shipped as-is) or a warning was
    // shown earlier (shownPhrase) and the text no longer matches (edited).
    const phrase = match?.phrase ?? body.shownPhrase
    if (!phrase) return NextResponse.json({ ok: true })
    const { error } = await service.from('fair_housing_flags').insert({
      user_id: user.id,
      matched_phrase: phrase.slice(0, 200),
      field,
      submitted_with_match: Boolean(match),
    })
    if (error) console.error('[fair-housing] log failed:', error.message)
    return NextResponse.json({ ok: true })
  }

  // phase 'warn': log only genuine server-side matches.
  if (match) {
    const { error } = await service.from('fair_housing_flags').insert({
      user_id: user.id,
      matched_phrase: match.phrase,
      field,
      submitted_with_match: null,
    })
    if (error) console.error('[fair-housing] log failed:', error.message)
  }
  return NextResponse.json({ ok: true, matched: match?.phrase ?? null })
}
