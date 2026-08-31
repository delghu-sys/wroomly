import { ImageResponse } from 'next/og'

/**
 * The site-wide social share card, served at /og-default.png.
 *
 * Twelve pages' metadata (and the auth/guide/building OG tags) already point
 * at this exact URL — but the file never existed, so every shared Wroomly
 * link rendered with no preview image. Serving it as a generated route makes
 * all of those references real at once, with zero metadata churn, and keeps
 * the card on brand tokens by construction. Swap in a designed PNG later by
 * deleting this route and dropping public/og-default.png.
 *
 * Listing detail pages have their own richer per-listing card (story-image).
 */

export const runtime = 'edge'

const NAVY = '#00193c'
const MAIZE = '#fdc010'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: NAVY,
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: MAIZE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: NAVY,
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            w
          </div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: 'white', letterSpacing: -1 }}>
            wroomly
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 84,
              fontWeight: 800,
              color: 'white',
              letterSpacing: -3,
              lineHeight: 1.05,
            }}
          >
            Find your Ann Arbor
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 84,
              fontWeight: 800,
              color: MAIZE,
              letterSpacing: -3,
              lineHeight: 1.05,
            }}
          >
            sublet.
          </div>
        </div>

        {/* Footer strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '2px solid rgba(255,255,255,0.16)',
            paddingTop: 36,
          }}
        >
          <div style={{ display: 'flex', color: 'rgba(255,255,255,0.85)', fontSize: 32 }}>
            UMich student sublets · Ann Arbor
          </div>
          <div style={{ display: 'flex', color: MAIZE, fontSize: 36, fontWeight: 700 }}>
            wroomly.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Immutable-ish: crawlers cache OG images aggressively anyway; a day
        // keeps regeneration cost near zero without locking in a stale card
        // for long if the design changes.
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    },
  )
}
