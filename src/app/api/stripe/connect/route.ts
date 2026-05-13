import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

// POST /api/stripe/connect — create Stripe Connect onboarding link for supplier
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_account_id, user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'supplier' && profile?.user_type !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
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

    const origin = process.env.NEXT_PUBLIC_APP_URL!

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
