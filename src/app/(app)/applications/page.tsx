import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { formatCents } from '@/lib/utils/listing'

export const metadata: Metadata = { title: 'My Applications' }

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-[oklch(0.55_0.15_75)] border-[oklch(0.85_0.1_75)] bg-[oklch(0.97_0.04_75)]',
  accepted: 'text-[oklch(0.55_0.15_142)] border-[oklch(0.85_0.1_142)] bg-[oklch(0.97_0.04_142)]',
  rejected: 'text-[oklch(0.55_0.2_25)] border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)]',
  withdrawn: 'text-ink-muted border-line bg-surface',
}

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select(`
      *,
      listings(id, title, type, price_per_month, neighborhood, available_from, available_to)
    `)
    .eq('consumer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="animate-fade-up mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
          {inquiries?.length ?? 0} {inquiries?.length === 1 ? 'application' : 'applications'}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
          My <span className="italic font-light text-navy">applications.</span>
        </h1>
      </div>

      {!inquiries || inquiries.length === 0 ? (
        <div className="animate-fade-up delay-100 text-center py-20 rounded-3xl border border-dashed border-line bg-surface/60">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-navy-soft text-navy items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="font-display text-2xl text-ink">No applications yet</p>
          <p className="text-sm text-ink-muted mt-2 mb-6 max-w-sm mx-auto">
            Browse listings and send your first inquiry to start the conversation.
          </p>
          <Link href="/listings">
            <Button className="press rounded-full bg-navy text-white hover:bg-navy/90 h-11 px-6">
              Browse listings
            </Button>
          </Link>
        </div>
      ) : (
        <div className="stagger-reveal space-y-4">
          {inquiries.map(inq => {
            const listing = inq.listings as {
              id: string; title: string; type: string;
              price_per_month: number | null; neighborhood: string | null;
              available_from: string; available_to: string
            } | null

            return (
              <div key={inq.id} className="lift bg-surface border border-line rounded-3xl p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/listings/${listing?.id}`} className="font-display text-lg text-ink hover:text-navy ease-smooth transition-colors block truncate">
                      {listing?.title}
                    </Link>
                    <p className="text-sm text-ink-muted mt-1">
                      {listing?.neighborhood} ·{' '}
                      {listing?.type === 'sublet' && listing?.price_per_month
                        ? <span className="font-display text-ink">{formatCents(listing.price_per_month)}/mo</span>
                        : <span className="font-display text-navy">Swap</span>}
                    </p>
                    <p className="text-xs text-ink-muted mt-1.5">
                      Applied {format(parseISO(inq.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant="outline" className={`rounded-full text-xs font-medium ${STATUS_COLORS[inq.status] ?? ''}`}>
                    {inq.status.charAt(0).toUpperCase() + inq.status.slice(1)}
                  </Badge>
                </div>

                <p className="text-sm text-ink-soft bg-navy-soft/40 rounded-2xl p-4 line-clamp-3 mb-3 border border-line/50">
                  {inq.message}
                </p>

                {inq.status === 'accepted' && (
                  <Link href="/messages">
                    <Button size="sm" variant="outline" className="press rounded-full border-line hover:border-navy hover:text-navy">
                      <MessageSquare className="w-3.5 h-3.5 mr-1" /> Open chat
                    </Button>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
