import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Clock, CheckCircle2, Wallet } from 'lucide-react'
import { formatCents } from '@/lib/utils/listing'
import { format, parseISO, isPast, addDays } from 'date-fns'
import type { Transaction, User } from '@/types/database'
import { fetchConnectStatus } from '@/lib/stripe'
import { PayoutAccountCard } from '@/components/payments/PayoutAccountCard'
import { PAYMENTS_ENABLED } from '@/lib/config'

export const metadata: Metadata = { title: 'Payouts' }

export default async function PayoutsPage() {
  // Payouts don't exist in the matching-only launch. Send anyone who
  // lands here (old link, bookmark) back to their dashboard.
  if (!PAYMENTS_ENABLED) redirect('/dashboard')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [profileRes, transactionsRes] = await Promise.all([
    supabase
      .from('users')
      .select('user_type, stripe_account_id')
      .eq('id', user.id)
      .single(),
    supabase
      .from('transactions')
      .select('*')
      .eq('payee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const profile = profileRes.data as Pick<
    User,
    'user_type' | 'stripe_account_id'
  > | null
  if (profile?.user_type !== 'supplier' && profile?.user_type !== 'admin')
    redirect('/dashboard')

  // Lookup payout-account state for the gating card.
  const connect = await fetchConnectStatus(profile?.stripe_account_id)

  const transactions = (transactionsRes.data ?? []) as Transaction[]

  const succeeded = transactions.filter(t => t.status === 'succeeded')

  // Supplier net = rent received − platform fee − whatever Stripe already
  // sent back to the consumer via refunds. (Refunds reduce the destination
  // account's balance automatically; we mirror that here so the UI matches
  // what Stripe will actually pay out.)
  const supplierNet = (t: Transaction) =>
    t.amount_cents - t.platform_fee_cents - (t.refunded_cents ?? 0)

  // Pending: payment received but release_date hasn't passed yet (+ 24h buffer like Airbnb)
  const pendingPayout = succeeded
    .filter(t => t.release_date && !isPast(addDays(parseISO(t.release_date), 1)))
    .reduce((sum, t) => sum + supplierNet(t), 0)

  // Available: release_date has passed — ready for payout
  const availablePayout = succeeded
    .filter(t => !t.release_date || isPast(addDays(parseISO(t.release_date), 1)))
    .reduce((sum, t) => sum + supplierNet(t), 0)

  const totalEarned = succeeded.reduce((sum, t) => sum + supplierNet(t), 0)

  const STATUS_COLORS: Record<string, string> = {
    pending: 'text-[oklch(0.55_0.15_75)] border-[oklch(0.85_0.1_75)] bg-[oklch(0.97_0.04_75)]',
    succeeded: 'text-[oklch(0.55_0.15_142)] border-[oklch(0.85_0.1_142)] bg-[oklch(0.97_0.04_142)]',
    failed: 'text-[oklch(0.55_0.2_25)] border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)]',
    refunded: 'text-ink-muted border-line bg-surface',
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="animate-fade-up mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
          Earnings
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
          Your <span className="italic font-light text-navy">payouts.</span>
        </h1>
      </div>

      {/* Payout account state — drives the rest of the supplier flow */}
      <div className="animate-fade-up delay-50 mb-6">
        <PayoutAccountCard
          status={connect.status}
          detailsSubmitted={connect.detailsSubmitted}
        />
      </div>

      {/* How it works */}
      <div className="animate-fade-up delay-75 bg-navy-soft border border-line rounded-2xl p-5 mb-8">
        <p className="text-sm text-ink-soft leading-relaxed">
          <strong className="text-ink">How payouts work:</strong> When a
          student books your place, Stripe routes the rent straight to your
          connected account at checkout. Stripe pays out to your bank on its
          standard schedule (usually 2 business days). The 5% Wroomly service
          fee is paid by the consumer on top of the rent — you receive the
          full amount you listed.
        </p>
      </div>

      {/* Stats */}
      <div className="animate-fade-up delay-100 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="lift bg-surface border border-line rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-navy-soft flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-navy" />
            </div>
            <p className="text-xs text-ink-muted font-medium">Total earned</p>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{formatCents(totalEarned)}</p>
        </div>

        <div className="lift bg-surface border border-line rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[oklch(0.93_0.08_142)] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[oklch(0.45_0.15_142)]" />
            </div>
            <p className="text-xs text-ink-muted font-medium">Available</p>
          </div>
          <p className="font-display text-2xl font-bold text-[oklch(0.45_0.15_142)]">{formatCents(availablePayout)}</p>
        </div>

        <div className="lift bg-surface border border-line rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-maize/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-navy" />
            </div>
            <p className="text-xs text-ink-muted font-medium">Pending</p>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{formatCents(pendingPayout)}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="animate-fade-up delay-150">
        <h2 className="font-display text-lg font-semibold text-ink mb-4">Transaction history</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-dashed border-line bg-surface/60">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-navy-soft text-navy items-center justify-center mb-4">
              <Wallet className="w-6 h-6" />
            </div>
            <p className="font-display text-2xl text-ink">No transactions yet</p>
            <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">
              When students book your listings, payments will appear here.
            </p>
          </div>
        ) : (
          <div className="stagger-reveal space-y-2">
            {transactions.map(t => {
              const supplierAmount = t.amount_cents - t.platform_fee_cents
              const isReleased = !t.release_date || isPast(addDays(parseISO(t.release_date), 1))

              return (
                <div key={t.id} className="lift bg-surface border border-line rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink text-sm capitalize">
                      {t.type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {format(parseISO(t.created_at), 'MMM d, yyyy')}
                      {t.release_date && t.status === 'succeeded' && (
                        <span>
                          {' · '}
                          {isReleased
                            ? 'Payout available'
                            : `Releases ${format(addDays(parseISO(t.release_date), 1), 'MMM d')}`}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-ink">
                      {formatCents(supplierAmount)}
                    </p>
                    <Badge variant="outline" className={`text-xs font-medium rounded-full ${STATUS_COLORS[t.status] ?? ''}`}>
                      {t.status === 'succeeded' && !isReleased ? 'held' : t.status}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
