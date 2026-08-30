import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Home, Users, Flag, CreditCard, Sparkles, ArrowRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin Dashboard' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileData } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if ((profileData as { user_type?: string } | null)?.user_type !== 'admin') redirect('/dashboard')

  const [pendingListingsRes, totalUsersRes, openReportsRes, totalTxRes, pendingImportsRes] =
    await Promise.all([
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('transactions').select('amount_cents').eq('status', 'succeeded'),
      // Import requests aren't readable by `authenticated` under RLS, so this
      // count runs under the service role — same as /admin/import-review does.
      // Safe here: the admin check above has already redirected everyone else.
      createServiceClient()
        .from('listing_import_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'awaiting_admin_review'),
    ])

  const totalRevenue = ((totalTxRes.data ?? []) as { amount_cents: number }[])
    .reduce((sum, t) => sum + t.amount_cents, 0)

  const pendingListings = pendingListingsRes.count ?? 0
  const openReports = openReportsRes.count ?? 0
  const pendingImports = pendingImportsRes.count ?? 0

  // Anything queued behind a human decision. Drives the eyebrow, so the first
  // line of the page answers "is there anything for me to do" before you read
  // a single number.
  const needsAttention = pendingListings + openReports + pendingImports

  const stats = [
    { icon: Home, label: 'Pending review', value: pendingListings, href: '/admin/listings', alert: pendingListings > 0 },
    { icon: Flag, label: 'Open reports', value: openReports, href: '/admin/reports', alert: openReports > 0 },
    { icon: Users, label: 'Total users', value: totalUsersRes.count ?? 0, href: '/admin/users', alert: false },
    { icon: CreditCard, label: 'GMV (succeeded)', value: `$${(totalRevenue / 100).toLocaleString()}`, href: null, alert: false },
  ]

  const sections = [
    { href: '/admin/listings', label: 'Review listings', desc: 'Approve or reject what suppliers submitted.', icon: Home, count: pendingListings },
    { href: '/admin/users', label: 'Manage users', desc: 'Verify, suspend, or look up an account.', icon: Users, count: 0 },
    { href: '/admin/reports', label: 'Handle reports', desc: 'Flags on listings, messages, and people.', icon: Flag, count: openReports },
    { href: '/admin/import-review', label: 'AI imports', desc: 'Check what the importer extracted before it goes live.', icon: Sparkles, count: pendingImports },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="animate-fade-up mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
          {needsAttention === 0
            ? 'Queue is clear'
            : `${needsAttention} ${needsAttention === 1 ? 'item needs' : 'items need'} attention`}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
          Admin <span className="italic font-light text-navy">console.</span>
        </h1>
      </div>

      {/* Numbers first. Anything waiting on a person is maize; everything else
          is a quiet navy tile, so the queue reads at a glance without counting. */}
      <div className="animate-fade-up delay-100 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
        {stats.map(({ icon: Icon, label, value, href, alert }) => {
          const card = (
            <div
              className={`h-full bg-surface rounded-3xl p-5 border shadow-1 transition-shadow duration-300 ${
                alert
                  ? 'border-maize-bright/60 hover:shadow-glow-maize'
                  : 'border-line hover:shadow-2'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${
                  alert ? 'bg-maize-bright text-navy-deep' : 'bg-navy-deep text-maize-bright'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <p
                className={`font-display text-3xl tracking-tight tabular-nums leading-none ${
                  alert ? 'text-gold-deep' : 'text-ink'
                }`}
              >
                {value}
              </p>
              <p className="text-[13px] text-ink-muted mt-1.5">{label}</p>
            </div>
          )
          // GMV has nowhere to go — render it as a plain tile rather than a
          // link to "#", which looked clickable and did nothing.
          return href ? (
            <Link key={label} href={href} className="lift block h-full">
              {card}
            </Link>
          ) : (
            <div key={label}>{card}</div>
          )
        })}
      </div>

      <div className="animate-fade-up delay-200 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {sections.map(({ href, label, desc, icon: Icon, count }) => (
          <Link
            key={href}
            href={href}
            className="group lift bg-surface border border-line rounded-3xl p-6 shadow-1 hover:shadow-2 transition-shadow duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-navy-deep text-maize-bright flex items-center justify-center">
                <Icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex items-center gap-2">
                {count > 0 ? (
                  <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-maize-bright/20 text-gold-deep text-xs font-semibold tabular-nums">
                    {count}
                  </span>
                ) : null}
                <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-navy group-hover:translate-x-0.5 ease-smooth transition-all" />
              </div>
            </div>
            <p className="font-display text-lg text-ink tracking-tight group-hover:text-navy ease-smooth transition-colors">
              {label}
            </p>
            <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
