import Link from 'next/link'
import Image from 'next/image'
import type { ListingWithDetails } from '@/types/database'
import { formatCents, getListingImageUrl } from '@/lib/utils/listing'
import { Sparkles, BedDouble } from 'lucide-react'

/**
 * "Just listed" strip (audit item 3): the newest active listings (≤72h) in a
 * horizontal scroll above the grid. Honest by construction — fed only by a
 * created_at-filtered query, hidden entirely when fewer than 3 exist, so it
 * never pads itself with old inventory. Server component; no client JS.
 */
export function JustListedStrip({ listings }: { listings: ListingWithDetails[] }) {
  if (listings.length < 3) return null

  return (
    <section aria-label="Just listed" className="mb-8" data-testid="just-listed-strip">
      <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[oklch(0.45_0.13_85)] font-bold mb-3">
        <Sparkles className="w-3.5 h-3.5" /> Just listed
      </p>
      <div
        className="flex gap-3 overflow-x-auto snap-x pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {listings.map(l => {
          const first = [...(l.listing_images ?? [])].sort(
            (a, b) => a.display_order - b.display_order,
          )[0]
          return (
            <Link
              key={l.id}
              href={`/listings/${l.id}`}
              className="snap-start shrink-0 w-44 group"
            >
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[oklch(0.95_0.01_85)] border border-line">
                {first ? (
                  <Image
                    src={getListingImageUrl(first.storage_path)}
                    alt={l.title}
                    fill
                    className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    sizes="176px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BedDouble className="w-7 h-7 text-ink-muted/30" />
                  </div>
                )}
                <span className="absolute top-2 left-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.08em] bg-[oklch(0.84_0.17_85)] text-[oklch(0.22_0.075_256)]">
                  New
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] font-medium text-ink truncate">{l.title}</p>
              {l.price_per_month && (
                <p className="text-[12px] text-ink-muted">{formatCents(l.price_per_month)}/mo</p>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
