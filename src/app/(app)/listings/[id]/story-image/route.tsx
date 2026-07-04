import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { getListingImageUrl, formatDateRange } from '@/lib/utils/listing'

// Social: vertical 1080×1920 story card per listing — sized for Instagram
// stories / TikTok / Snapchat. Companion to ../opengraph-image.tsx (1200×630,
// which stays the crawler-facing OG card); this one is fetched on demand by
// the ShareListing sheet and pushed through the Web Share API as a file.
// Same data fetch + palette as the OG route, plus dates + wroomly.app.

export const runtime = 'nodejs'

const NAVY = '#11131f'
const MAIZE = '#e8b73f'
const W = 1080
const H = 1920

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  let title = 'Student sublet in Ann Arbor'
  let neighborhood: string | null = null
  let priceLabel: string | null = null
  let bedroomsLabel: string | null = null
  let datesLabel: string | null = null
  let coverUrl: string | null = null

  try {
    // Anon read — RLS allows status='active' without auth.
    const supabase = await createClient()
    const { data } = await supabase
      .from('listings')
      .select(
        'title, neighborhood, price_per_month, bedrooms, available_from, available_to, listing_images(storage_path, display_order)',
      )
      .eq('id', id)
      .eq('status', 'active')
      .single()

    if (data) {
      title = data.title ?? title
      neighborhood = data.neighborhood ?? null
      if (data.price_per_month) {
        priceLabel = `$${Math.round(data.price_per_month / 100).toLocaleString()}/mo`
      }
      bedroomsLabel =
        data.bedrooms === 0 ? 'Studio' : data.bedrooms ? `${data.bedrooms} bed` : null
      if (data.available_from && data.available_to) {
        datesLabel = formatDateRange(data.available_from, data.available_to)
      } else if (data.available_from) {
        datesLabel = `From ${formatDateRange(data.available_from, data.available_from)}`
      }
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

  const metaLine = [bedroomsLabel, neighborhood ?? 'Ann Arbor'].filter(Boolean).join(' · ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: NAVY,
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Photo fills the top ~2/3 */}
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders raw elements; next/image can't run here
          <img
            src={coverUrl}
            alt=""
            width={W}
            height={Math.round(H * 0.66)}
            style={{
              width: '100%',
              height: `${Math.round(H * 0.66)}px`,
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: `${Math.round(H * 0.66)}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(160deg, #1a2035 0%, #11131f 100%)',
              color: MAIZE,
              fontSize: 200,
              fontWeight: 700,
            }}
          >
            w
          </div>
        )}

        {/* Seam gradient into the info panel */}
        <div
          style={{
            position: 'absolute',
            top: Math.round(H * 0.66) - 220,
            left: 0,
            width: '100%',
            height: 220,
            background: 'linear-gradient(180deg, rgba(17,19,31,0) 0%, rgba(17,19,31,0.9) 88%, #11131f 100%)',
          }}
        />

        {/* Brand wordmark top-left */}
        <div
          style={{
            position: 'absolute',
            top: 56,
            left: 64,
            display: 'flex',
            alignItems: 'center',
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'white',
            textShadow: '0 2px 12px rgba(0,0,0,0.55)',
          }}
        >
          <span style={{ color: MAIZE }}>w</span>roomly
        </div>

        {/* Verified chip top-right */}
        <div
          style={{
            position: 'absolute',
            top: 62,
            right: 64,
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(17,19,31,0.72)',
            border: `2px solid ${MAIZE}`,
            color: 'white',
            fontSize: 26,
            fontWeight: 600,
            padding: '12px 24px',
            borderRadius: 999,
          }}
        >
          @umich.edu verified
        </div>

        {/* Info panel */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 64px 72px 64px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {priceLabel && (
              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  background: MAIZE,
                  color: NAVY,
                  fontSize: 54,
                  fontWeight: 700,
                  padding: '14px 36px',
                  borderRadius: 999,
                }}
              >
                {priceLabel}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                color: 'white',
                fontSize: 62,
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                maxWidth: '100%',
              }}
            >
              {title.length > 70 ? `${title.slice(0, 67)}…` : title}
            </div>
            <div style={{ display: 'flex', color: 'rgba(255,255,255,0.82)', fontSize: 40 }}>
              {metaLine}
            </div>
            {datesLabel && (
              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  border: '2px solid rgba(255,255,255,0.35)',
                  color: 'white',
                  fontSize: 34,
                  fontWeight: 600,
                  padding: '12px 28px',
                  borderRadius: 999,
                }}
              >
                {datesLabel}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '2px solid rgba(255,255,255,0.16)',
              paddingTop: 40,
            }}
          >
            <div style={{ display: 'flex', color: 'rgba(255,255,255,0.85)', fontSize: 36 }}>
              Sublets by verified U-M students
            </div>
            <div style={{ display: 'flex', color: MAIZE, fontSize: 40, fontWeight: 700 }}>
              wroomly.app
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  )
}
