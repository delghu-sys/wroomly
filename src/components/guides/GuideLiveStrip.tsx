import Link from 'next/link'
import Image from '@/components/ui/StorageImage'
import { ArrowRight, BedDouble, Footprints, Sofa } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PUBLIC_LISTING_COLUMNS } from '@/lib/listings/columns'
import { getListingImageUrl } from '@/lib/utils/listing'
import { walkToCampus } from '@/lib/campus'
import type { ListingWithDetails } from '@/types/database'

/**
 * The newest real listings, at the foot of a guide: the one part of an article
 * that is Wroomly's own. Read on each request; hidden when fewer than three
 * have a photo, so it never pads itself. Shows no prices, which this strip
 * would otherwise have to keep current.
 */
async function newest(): Promise<ListingWithDetails[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('listings')
      .select(`${PUBLIC_LISTING_COLUMNS}, listing_images(*)`)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(12)
    return ((data ?? []) as unknown as ListingWithDetails[]).filter(l => (l.listing_images ?? []).length > 0).slice(0, 4)
  } catch {
    return []
  }
}

export async function GuideLiveStrip() {
  const live = await newest()
  if (live.length < 3) return null
  return (
    <section className="py-16 sm:py-20" style={{ background: 'oklch(0.97 0.008 75)' }} aria-label="Newest listings on Wroomly">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-gold-deep font-semibold">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
                <span className="rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              On Wroomly right now
            </p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-ink mt-3">
              The newest <span className="italic font-light text-gold-deep">sublets.</span>
            </h2>
          </div>
          <Link href="/listings" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline underline-offset-4 shrink-0">
            See all <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>
        <ul className="mt-9 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {live.map(l => {
            const first = [...(l.listing_images ?? [])].sort((a, b) => a.display_order - b.display_order)[0]
            const walk = walkToCampus(l.lat, l.lng)
            return (
              <li key={l.id}>
                <Link href={`/listings/${l.id}`} className="group block">
                  <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-navy-soft">
                    {first ? (
                      <Image src={getListingImageUrl(first.storage_path)} alt={l.title} fill sizes="(min-width: 1024px) 280px, 45vw" className="object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                    ) : (
                      <BedDouble className="absolute inset-0 m-auto w-8 h-8 text-ink-muted/30" />
                    )}
                    {l.furnished && (
                      <span className="absolute left-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-maize-bright text-navy-deep px-2.5 py-1 text-[11px] font-bold">
                        <Sofa className="w-3 h-3" strokeWidth={2.25} /> Furnished
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-[15px] font-medium text-ink leading-snug line-clamp-2">{l.title}</p>
                  {walk && (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
                      <Footprints className="w-3.5 h-3.5" strokeWidth={1.75} /> {walk.label}
                    </p>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
