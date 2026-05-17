import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/stripe/connect
 *
 * Body: `{ action?: 'onboard' | 'dashboard' }` (default `'onboard'`).
 *
 *   onboard   — creates the Express account if needed and returns a
 *               one-time onboarding URL. Use when the supplier has
 *               never started or hasn't finished verification.
 *   dashboard — returns a Stripe Express login link to the supplier's
 *               existing dashboard. Use when they're already active and
 *               want to see payouts / change bank info.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let action: 'onboard' | 'dashboard' = 'onboard'
  try {
    const body = (await request.json()) as { action?: 'onboard' | 'dashboard' }
    if (body?.action === 'dashboard') action = 'dashboard'
  } catch {
    // No body — keep default 'onboard'.
  }

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_account_id, user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'supplier' && profile?.user_type !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL!

  try {
    // ── Dashboard login — supplier already onboarded ──
    if (action === 'dashboard') {
      if (!profile.stripe_account_id) {
        return NextResponse.json(
          { error: 'No connected account on file yet.' },
          { status: 422 }
        )
      }
      const link = await stripe.accounts.createLoginLink(profile.stripe_account_id)
      return NextResponse.json({ url: link.url })
    }

    // ── Onboarding — create account if missing, then a fresh account link ──
    let accountId = profile.stripe_account_id
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        metadata: { user_id: user.id },
      })
      accountId = account.id

      await supabase
        .from('users')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id)
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/payouts?refresh=true`,
      return_url: `${origin}/payouts?success=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error('Stripe Connect error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
