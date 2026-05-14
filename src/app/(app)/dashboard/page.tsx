import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Home, MessageSquare, Search, Star, Plus, ArrowRight, CheckCircle2 } from 'lucide-react'
import { formatCents } from '@/lib/utils/listing'
import { format, parseISO } from 'date-fns'
import type { User, Listing, Inquiry, Transaction } from '@/types/database'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as User | null
  if (!profile) redirect('/sign-in')

  const isSupplier = profile.user_type === 'supplier' || profile.user_type === 'admin'

  if (isSupplier) {
    const listingsRes = await supabase
      .from('listings')
      .select('id, status, title')
      .eq('supplier_id', user.id)

    const listings = (listingsRes.data ?? []) as Pick<Listing, 'id' | 'status' | 'title'>[]
    const listingIds = listings.map(l => l.id)

    const [inquiriesRes, unreadRes] = await Promise.all([
      listingIds.length > 0
        ? supabase
          .from('inquiries')
          .select('id, status, listing_id')
          .in('listing_id', listingIds)
          .eq('status', 'pending')
        : { data: [] },
      (async () => {
        const convoRes = await supabase
          .from('conversations')
          .select('id')
          .eq('supplier_id', user.id)
        const convoIds = ((convoRes.data ?? []) as { id: string }[]).map(c => c.id)
        if (convoIds.length === 0) return { count: 0 }
        return supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('is_read', false)
          .neq('sender_id', user.id)
          .in('conversation_id', convoIds)
      })(),
    ])

    const pendingInquiries = (inquiriesRes.data ?? []) as { id: string; status: string; listing_id: string }[]
    const unreadMessages = 'count' in unreadRes ? (unreadRes.count ?? 0) : 0
    const activeListings = listings.filter(l => l.status === 'active').length

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="animate-fade-up mb-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
              Supplier dashboard
            </p>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
              Welcome back, <span className="italic font-light text-navy">{profile.full_name?.split(' ')[0]}.</span>
            </h1>
            <p className="text-ink-muted mt-2">Here&apos;s what&apos;s happening with your listings.</p>
          </div>
          <Link href="/listings/new">
            <Button className="press rounded-full bg-navy text-white hover:bg-navy/90 h-11 px-5 shadow-[0_8px_24px_oklch(0.27_0.07_257_/_0.22)]">
              <Plus className="w-4 h-4 mr-1" /> List a place
            </Button>
          </Link>
        </div>

        <div className="stagger-reveal grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Home, label: 'Active listings', value: activeListings, href: '/my-listings' },
            { icon: MessageSquare, label: 'Pending inquiries', value: pendingInquiries.length, href: '/inquiries', alert: pendingInquiries.length > 0 },
            { icon: MessageSquare, label: 'Unread messages', value: unreadMessages, href: '/messages', alert: unreadMessages > 0 },
          ].map(({ icon: Icon, label, value, href, alert }) => (
            <Link key={label} href={href} className="group">
              <div className="lift glow-warm sheen bg-surface rounded-3xl border border-line p-6 h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-ink-muted font-medium">{label}</p>
                    <p className={`font-display text-4xl tracking-tight mt-2 ${alert ? 'text-navy' : 'text-ink'}`}>
                      {value}
                    </p>
                  </div>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ease-smooth transition-all duration-500 ${
                    alert
                      ? 'bg-maize text-navy group-hover:rotate-[-6deg]'
                      : 'bg-navy-soft text-navy group-hover:bg-navy group-hover:text-white'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {pendingInquiries.length > 0 && (
          <div className="animate-fade-up delay-200 bg-surface rounded-3xl border border-line overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-line">
              <h2 className="font-display text-xl tracking-tight text-ink">Pending inquiries</h2>
              <Link href="/inquiries" className="text-sm text-navy hover:text-ink underline-grow flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-line">
              {pendingInquiries.slice(0, 3).map(inq => (
                <Link
                  key={inq.id}
                  href="/inquiries"
                  className="flex items-center justify-between px-6 py-4 ease-smooth transition-colors hover:bg-navy-soft/40"
                >
                  <p className="text-sm font-medium text-ink">
                    {listings.find(l => l.id === inq.listing_id)?.title ?? 'Listing'}
                  </p>
                  <Badge variant="outline" className="rounded-full text-[oklch(0.55_0.15_75)] border-[oklch(0.85_0.1_75)] bg-[oklch(0.97_0.04_75)]">
                    Pending
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {listings.length === 0 && (
          <div className="animate-fade-up delay-200 text-center py-16 rounded-3xl border border-dashed border-line bg-surface/60">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-navy-soft text-navy items-center justify-center mb-4">
              <Home className="w-6 h-6" />
            </div>
            <p className="font-display text-2xl text-ink">No listings yet</p>
            <p className="text-sm text-ink-muted mt-2 mb-6 max-w-sm mx-auto">
              Create your first listing to start receiving inquiries from verified students.
            </p>
            <Link href="/listings/new">
              <Button className="press rounded-full bg-navy text-white hover:bg-navy/90 h-11 px-6">
                Create your first listing
              </Button>
            </Link>
          </div>
        )}
      </div>
    )
  }

  // Consumer dashboard — fetch bookings (paid transactions)
  const { data: bookingsData } = await supabase
    .from('transactions')
    .select('id, listing_id, amount_cents, platform_fee_cents, status, created_at, release_date')
    .eq('payer_id', user.id)
    .eq('status', 'succeeded')
    .order('created_at', { ascending: false })

  const bookings = (bookingsData ?? []) as Transaction[]

  // Fetch listing titles for bookings
  const bookingListingIds = [...new Set(bookings.map(b => b.listing_id))]
  let bookingListings: Record<string, { title: string; id: string }> = {}
  if (bookingListingIds.length > 0) {
    const { data: bListings } = await supabase
      .from('listings')
      .select('id, title')
      .in('id', bookingListingIds)
    for (const bl of (bListings ?? []) as { id: string; title: string }[]) {
      bookingListings[bl.id] = bl
    }
  }

  const [inquiriesRes, favoritesRes, unreadRes] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id, status, created_at, listing_id')
      .eq('consumer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('favorites')
      .select('id, listing_id')
      .eq('user_id', user.id)
      .limit(5),
    (async () => {
      const convoRes = await supabase
        .from('conversations')
        .select('id')
        .eq('consumer_id', user.id)
      const convoIds = ((convoRes.data ?? []) as { id: string }[]).map(c => c.id)
      if (convoIds.length === 0) return { count: 0 }
      return supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id)
        .in('conversation_id', convoIds)
    })(),
  ])

  const inquiries = (inquiriesRes.data ?? []) as Pick<Inquiry, 'id' | 'status' | 'created_at' | 'listing_id'>[]

  // Fetch listing titles for inquiries
  const inquiryListingIds = [...new Set(inquiries.map(i => i.listing_id))]
  const inquiryListingTitles: Record<string, string> = {}
  if (inquiryListingIds.length > 0) {
    const { data: iListings } = await supabase
      .from('listings')
      .select('id, title')
      .in('id', inquiryListingIds)
    for (const il of (iListings ?? []) as { id: string; title: string }[]) {
      inquiryListingTitles[il.id] = il.title
    }
  }
  const favorites = (favoritesRes.data ?? []) as { id: string; listing_id: string }[]
  const unreadMessages = 'count' in unreadRes ? (unreadRes.count ?? 0) : 0

  const STATUS_COLORS: Record<string, string> = {
    pending: 'text-[oklch(0.55_0.15_75)] border-[oklch(0.85_0.1_75)] bg-[oklch(0.97_0.04_75)]',
    accepted: 'text-[oklch(0.55_0.15_142)] border-[oklch(0.85_0.1_142)] bg-[oklch(0.97_0.04_142)]',
    rejected: 'text-[oklch(0.55_0.2_25)] border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)]',
    withdrawn: 'text-ink-muted border-line bg-surface',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="animate-fade-up mb-10">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
          Your dashboard
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
          Welcome back, <span className="italic font-light text-navy">{profile.full_name?.split(' ')[0]}.</span>
        </h1>
        <p className="text-ink-muted mt-2">Track your housing search.</p>
      </div>

      <div className="stagger-reveal grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { icon: Search, label: 'Applications', value: inquiries.length, href: '/applications' },
          { icon: Star, label: 'Saved listings', value: favorites.length, href: '/favorites' },
          { icon: MessageSquare, label: 'Unread messages', value: unreadMessages, href: '/messages', alert: unreadMessages > 0 },
        ].map(({ icon: Icon, label, value, href, alert }) => (
          <Link key={label} href={href} className="group">
            <div className="lift glow-warm sheen bg-surface rounded-3xl border border-line p-6 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-ink-muted font-medium">{label}</p>
                  <p className={`font-display text-4xl tracking-tight mt-2 ${alert ? 'text-navy' : 'text-ink'}`}>
                    {value}
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ease-smooth transition-all duration-500 ${
                  alert
                    ? 'bg-maize text-navy group-hover:rotate-[-6deg]'
                    : 'bg-navy-soft text-navy group-hover:bg-navy group-hover:text-white'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {bookings.length > 0 && (
        <div className="animate-fade-up delay-200 bg-surface rounded-3xl border border-line overflow-hidden mb-6">
          <div className="flex items-center justify-between px-6 py-5 border-b border-line">
            <h2 className="font-display text-xl tracking-tight text-ink">Your bookings</h2>
          </div>
          <div className="divide-y divide-line">
            {bookings.map(b => {
              const bl = bookingListings[b.listing_id]
              return (
                <Link
                  key={b.id}
                  href={`/listings/${b.listing_id}`}
                  className="flex items-center justify-between px-6 py-4 ease-smooth transition-colors hover:bg-navy-soft/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[oklch(0.93_0.08_142)] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[oklch(0.45_0.15_142)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{bl?.title ?? 'Listing'}</p>
                      <p className="text-xs text-ink-muted">
                        Paid {format(parseISO(b.created_at), 'MMM d, yyyy')}
                        {b.release_date && ` · Move-in ${format(parseISO(b.release_date), 'MMM d')}`}
                      </p>
                    </div>
                  </div>
                  <p className="font-display font-bold text-navy shrink-0">
                    {formatCents(b.amount_cents)}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {inquiries.length > 0 && (
        <div className="animate-fade-up delay-200 bg-surface rounded-3xl border border-line overflow-hidden mb-4">
          <div className="flex items-center justify-between px-6 py-5 border-b border-line">
            <h2 className="font-display text-xl tracking-tight text-ink">Recent applications</h2>
            <Link href="/applications" className="text-sm text-navy hover:text-ink underline-grow flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-line">
            {inquiries.map(inq => (
              <Link key={inq.id} href={`/listings/${inq.listing_id}`} className="flex items-center justify-between px-6 py-4 ease-smooth transition-colors hover:bg-navy-soft/40">
                <p className="text-sm font-medium text-ink truncate">
                  {inquiryListingTitles[inq.listing_id] ?? 'Listing'}
                </p>
                <Badge variant="outline" className={`rounded-full ${STATUS_COLORS[inq.status]}`}>
                  {inq.status.charAt(0).toUpperCase() + inq.status.slice(1)}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {inquiries.length === 0 && (
        <div className="animate-fade-up delay-200 text-center py-16 rounded-3xl border border-dashed border-line bg-surface/60">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-navy-soft text-navy items-center justify-center mb-4">
            <Search className="w-6 h-6" />
          </div>
          <p className="font-display text-2xl text-ink">No applications yet</p>
          <p className="text-sm text-ink-muted mt-2 mb-6 max-w-sm mx-auto">
            Browse listings and send your first inquiry to get the conversation started.
          </p>
          <Link href="/listings">
            <Button className="press rounded-full bg-navy text-white hover:bg-navy/90 h-11 px-6">
              Browse listings
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
