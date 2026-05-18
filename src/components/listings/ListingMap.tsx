'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'

// Mapbox v3 instantiates its authenticator at module evaluation time —
// statically importing `mapbox-gl` before the token is registered throws
// "Neither apiKey nor config.authenticator provided" at the page load.
// Defer the import until the component actually mounts on the client and
// we've confirmed a token exists, so the SDK never enters its broken
// no-token path. The CSS is still safe to import statically.
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

interface ListingMapProps {
  lat: number
  lng: number
  neighborhood: string | null
}

export function ListingMap({ lat, lng, neighborhood }: ListingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = useRef<any>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainer.current || map.current) return

    let cancelled = false

    ;(async () => {
      try {
        // Dynamic import — first reference to mapbox-gl in the bundle.
        // Webpack/Turbopack split this into a separate chunk that only
        // loads after MAPBOX_TOKEN is set in module scope below.
        const mapboxgl = (await import('mapbox-gl')).default
        if (cancelled) return

        mapboxgl.accessToken = MAPBOX_TOKEN!

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [lng, lat],
          zoom: 14,
        })

        map.current.on('load', () => {
          if (!map.current || cancelled) return
          map.current.addLayer({
            id: 'listing-location',
            type: 'circle',
            source: {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [lng, lat] },
                properties: {},
              },
            },
            paint: {
              // Maize-tinted privacy circle in brand color
              'circle-radius': 60,
              'circle-color': '#e8b73f',
              'circle-opacity': 0.22,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#e8b73f',
              'circle-stroke-opacity': 0.55,
            },
          })
        })
      } catch (err) {
        // Mapbox throwing anywhere (missing token, bad token, network
        // hiccup, SDK API drift) lands here. Don't bring the whole listing
        // page down — fall back to the placeholder.
        console.error('[ListingMap] failed to load Mapbox', err)
        if (!cancelled) setLoadFailed(true)
      }
    })()

    return () => {
      cancelled = true
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [lat, lng])

  // Placeholder fallback — token missing OR Mapbox blew up at runtime.
  if (!MAPBOX_TOKEN || loadFailed) {
    return (
      <div className="space-y-2">
        <div className="h-64 rounded-3xl border border-line bg-[oklch(0.97_0.01_85)] flex flex-col items-center justify-center text-ink-muted">
          <MapPin className="w-7 h-7 mb-2 text-[oklch(0.45_0.13_85)]" strokeWidth={1.5} />
          <p className="text-sm">Map unavailable</p>
          {neighborhood && (
            <p className="text-xs mt-1">{neighborhood}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapContainer}
        className="h-64 rounded-3xl overflow-hidden border border-line shadow-[0_4px_18px_oklch(0_0_0/0.05)]"
      />
      {neighborhood && (
        <p className="text-sm text-ink-muted leading-relaxed">
          Approximate location in{' '}
          <span className="font-medium text-ink">{neighborhood}</span>.
          Exact address shared after booking.
        </p>
      )}
    </div>
  )
}
