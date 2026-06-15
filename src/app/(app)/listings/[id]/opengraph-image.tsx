import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { getListingImageUrl } from '@/lib/utils/listing'

// SEO/social: dynamic 1200×630 OG image per listing. Shows the listing's
// cover photo (when available) under a dark gradient, with price,
// neighborhood, and Wroomly branding — drives clicks when a listing is
// shared in a GroupMe / iMessage / Instagram DM, which is a real
// discovery channel for a student product.

export const runtime = 'nodejs'
export const alt = 'Wroomly listing'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const NAVY = '#11131f'
const MAIZE = '#e8b73f'

export default async function Image({ params }: { params: { id: string } }) {
  // Anon read — active listings are readable without auth (RLS allows
  // status='active'). No cookies on a crawler request, which is fine.
  let title = 'Student sublet in Ann Arbor'
  let neighborhood: string | null = null
  let priceLabel: string | null = null
  let bedroomsLabel: string | null = null
  let coverUrl: string | null = null

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('listings')
      .select(
        'title, type, neighborhood, price_per_month, bedrooms, listing_images(storage_path, display_order)',
      )
      .eq('id', params.id)
      .eq('status', 'active')
      .single()

    if (data) {
      title = data.title ?? title
      neighborhood = data.neighborhood ?? null
      if (data.type === 'sublet' && data.price_per_month) {
        priceLabel = `$${Math.round(data.price_per_month / 100).toLocaleString()}/mo`
      } else if (data.type === 'swap') {
        priceLabel = 'Housing swap'
      }
      bedroomsLabel =
        data.bedrooms === 0
          ? 'Studio'
          : data.bedrooms
            ? `${data.bedrooms} bed`
            : null
      const imgs = (data.listing_images ?? []) as {
        storage_path: string
        display_order: number
      }[]
      const first = imgs.sort((a, b) => a.display_order - b.display_order).at(0)
      if (first) coverUrl = getListingImageUrl(first.storage_path)
    }
  } catch {
    // fall through to the branded text-only card
  }

  const metaLine = [bedroomsLabel, neighborhood ? `${neighborhood}, Ann Arbor` : 'Ann Arbor']
    .filter(Boolean)
    .join(' · ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          background: NAVY,
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
        {/* Dark gradient for legibility */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(17,19,31,0.15) 0%, rgba(17,19,31,0.45) 55%, rgba(17,19,31,0.92) 100%)',
          }}
        />

        {/* Brand wordmark top-left */}
        <div
          style={{
            position: 'absolute',
            top: 48,
            left: 56,
            display: 'flex',
            alignItems: 'center',
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'white',
          }}
        >
          <span style={{ color: MAIZE }}>w</span>roomly
        </div>

        {/* Bottom content */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            padding: '0 56px 56px 56px',
            gap: 14,
          }}
        >
          {priceLabel && (
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                background: MAIZE,
                color: NAVY,
                fontSize: 30,
                fontWeight: 700,
                padding: '8px 20px',
                borderRadius: 999,
              }}
            >
              {priceLabel}
            </div>
          )}
          <div
            style={{
              fontSize: 58,
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              maxWidth: 1000,
              display: 'flex',
            }}
          >
            {title.length > 70 ? `${title.slice(0, 70)}…` : title}
          </div>
          {metaLine && (
            <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.8)', display: 'flex' }}>
              {metaLine}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  )
}
