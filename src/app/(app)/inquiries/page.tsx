import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { InquiryActions } from '@/components/inquiries/InquiryActions'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format, parseISO } from 'date-fns'
import type { Inquiry, User, Listing } from '@/types/database'

export const metadata: Metadata = { title: 'Inquiries' }

type InquiryRow = Inquiry & {
  listings: Pick<Listing, 'id' | 'title' | 'type'> | null
  users: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'university'> | null
}

export default async function InquiriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileData } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()

  const userType = (profileData as { user_type?: string } | null)?.user_type
  if (userType !== 'supplier' && userType !== 'admin') {
    redirect('/dashboard')
  }

  // Get supplier's listing IDs first
  const listingsRes = await supabase
    .from('listings')
    .select('id')
    .eq('supplier_id', user.id)

  const listingIds = ((listingsRes.data ?? []) as { id: string }[]).map(l => l.id)

  const { data: inquiriesData } = listingIds.length > 0
    ? await supabase
      .from('inquiries')
      .select(`
        *,
        listings(id, title, type),
        users:consumer_id(id, full_name, avatar_url, university)
      `)
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false })
    : { data: [] }

  const inquiries = (inquiriesData ?? []) as InquiryRow[]

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'text-[oklch(0.55_0.15_75)] border-[oklch(0.85_0.1_75)] bg-[oklch(0.97_0.04_75)]' },
    accepted: { label: 'Accepted', color: 'text-[oklch(0.55_0.15_142)] border-[oklch(0.85_0.1_142)] bg-[oklch(0.97_0.04_142)]' },
    rejected: { label: 'Rejected', color: 'text-[oklch(0.55_0.2_25)] border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)]' },
    withdrawn: { label: 'Withdrawn', color: 'text-ink-muted border-line bg-surface' },
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="animate-fade-up mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
          {inquiries.length} {inquiries.length === 1 ? 'inquiry' : 'inquiries'}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
          Inbox of <span className="italic font-light text-navy">inquiries.</span>
        </h1>
      </div>

      {inquiries.length === 0 ? (
        <div className="animate-fade-up delay-100 text-center py-20 rounded-3xl border border-dashed border-line bg-surface/60">
          <p className="font-display text-2xl text-ink">No inquiries yet</p>
          <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">
            When students reach out about your listings, you&apos;ll see them here with their message and dates.
          </p>
        </div>
      ) : (
        <div className="stagger-reveal space-y-4">
          {inquiries.map(inq => {
            const consumer = inq.users
            const listing = inq.listings
            const status = STATUS_LABELS[inq.status] ?? STATUS_LABELS.pending
            const initials = consumer?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

            return (
              <div key={inq.id} className="lift bg-surface border border-line rounded-3xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 ring-1 ring-line">
                      <AvatarImage src={consumer?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-navy-soft text-navy text-sm font-medium">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-display text-base text-ink">{consumer?.full_name}</p>
                      <p className="text-sm text-ink-muted">{consumer?.university}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`rounded-full text-xs font-medium ${status.color}`}>{status.label}</Badge>
                </div>

                <p className="text-xs text-ink-muted mb-1">
                  Re: <span className="text-ink-soft font-medium">{listing?.title}</span>
                  {' · '}
                  {format(parseISO(inq.created_at), 'MMM d, yyyy')}
                </p>

                {inq.move_in_date && inq.move_out_date && (
                  <p className="text-xs text-navy font-medium mb-3 inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full bg-navy-soft">
                    Requested: {format(parseISO(inq.move_in_date), 'MMM d')} – {format(parseISO(inq.move_out_date), 'MMM d, yyyy')}
                  </p>
                )}

                <p className="text-sm text-ink-soft leading-relaxed my-4 bg-navy-soft/40 rounded-2xl p-4 border border-line/50">
                  {inq.message}
                </p>

                {inq.status === 'pending' && consumer && listing && (
                  <InquiryActions
                    inquiryId={inq.id}
                    consumerId={consumer.id}
                    listingId={listing.id}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
