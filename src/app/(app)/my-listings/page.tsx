import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PUBLIC_LISTING_COLUMNS } from '@/lib/listings/columns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, BedDouble } from 'lucide-react'
import { formatCents, formatDateRange } from '@/lib/utils/listing'
import type { Listing } from '@/types/database'

export const metadata: Metadata = { title: 'My Listings' }

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-ink-muted border-line bg-surface',
  pending_review: 'text-[oklch(0.55_0.15_75)] border-[oklch(0.85_0.1_75)] bg-[oklch(0.97_0.04_75)]',
  active: 'text-[oklch(0.55_0.15_142)] border-[oklch(0.85_0.1_142)] bg-[oklch(0.97_0.04_142)]',
  rented: 'text-navy border-navy/30 bg-navy-soft',
  swapped: 'text-[oklch(0.5_0.15_300)] border-[oklch(0.85_0.1_300)] bg-[oklch(0.97_0.04_300)]',
  archived: 'text-ink-muted border-line bg-surface',
}

export default async function MyListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileData } = await supabase.from('users').select('user_type').eq('id', user.id).single()
  const userType = (profileData as { user_type?: string } | null)?.user_type
  if (userType !== 'supplier' && userType !== 'admin') redirect('/dashboard')

  const { data: listingsData } = await supabase
    .from('listings')
    .select(PUBLIC_LISTING_COLUMNS)
    .eq('supplier_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const listings = (listingsData ?? []) as unknown as Listing[]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="animate-fade-up flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
            {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
            My <span className="italic font-light text-navy">listings.</span>
          </h1>
        </div>
        <Link href="/listings/new">
          <Button className="press rounded-full bg-navy text-white hover:bg-navy/90 h-11 px-5 shadow-[0_8px_24px_oklch(0.27_0.07_257_/_0.22)]">
            <Plus className="w-4 h-4 mr-1" /> New listing
          </Button>
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="animate-fade-up delay-100 text-center py-20 rounded-3xl border border-dashed border-line bg-surface/60">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-navy-soft text-navy items-center justify-center mb-4">
            <BedDouble className="w-6 h-6" />
          </div>
          <p className="font-display text-2xl text-ink">No listings yet</p>
          <p className="text-sm text-ink-muted mt-2 mb-6 max-w-sm mx-auto">
            Create your first listing and start receiving inquiries from verified students.
          </p>
          <Link href="/listings/new">
            <Button className="press rounded-full bg-navy text-white hover:bg-navy/90 h-11 px-6">
              Create your first listing
            </Button>
          </Link>
        </div>
      ) : (
        <div className="stagger-reveal space-y-3">
          {listings.map(listing => (
            <div
              key={listing.id}
              className="group lift bg-surface border border-line rounded-3xl p-6 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-display text-lg text-ink truncate group-hover:text-navy ease-smooth transition-colors">
                    {listing.title}
                  </h3>
                  <Badge variant="outline" className={`rounded-full text-xs font-medium ${STATUS_COLORS[listing.status] ?? ''}`}>
                    {listing.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-ink-muted">
                  {listing.price_per_month
                    ? <><span className="font-display text-ink">{formatCents(listing.price_per_month)}</span>/mo · </>
                    : <><span className="font-display text-ink-muted">Price TBD</span> · </>}
                  {formatDateRange(listing.available_from, listing.available_to)}
                </p>
              </div>
              <Link href={`/listings/${listing.id}/edit`} className="shrink-0">
                <Button variant="outline" size="sm" className="press rounded-full border-line hover:border-navy hover:text-navy">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
