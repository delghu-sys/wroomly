import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
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
      // Pre-fill the Express account's business profile so the supplier
      // doesn't get asked for a website / product description during
      // onboarding (most students don't have a website). Stripe still
      // collects identity (SSN, DOB, bank) but skips the business URL
      // step when we provide one upfront. We also tag the account as a
      // peer-to-peer rental marketplace so MCC and risk model are right.
      const account = await stripe.accounts.create({
        type: 'express',
        metadata: { user_id: user.id },
        business_type: 'individual',
        business_profile: {
          mcc: '6513', // "Real estate agents and managers — rentals"
          url: process.env.NEXT_PUBLIC_APP_URL!,
          product_description:
            'Subletting an apartment or dorm room to a verified U-of-M student via the Wroomly platform.',
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id

      // Migration 008 locks `stripe_account_id` from the user role via RLS
      // (so a malicious client can't claim someone else's Stripe account by
      // PATCHing their own row). The service-role client bypasses RLS,
      // which is the correct path for trust-sensitive writes done by an
      // authenticated server route after our own auth check above.
      const service = await createServiceClient()
      const { error: updateErr } = await service
        .from('users')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id)

      if (updateErr) {
        console.error('Failed to persist stripe_account_id', updateErr)
        return NextResponse.json(
          { error: 'Failed to save Stripe account. Please try again.' },
          { status: 500 }
        )
      }
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
