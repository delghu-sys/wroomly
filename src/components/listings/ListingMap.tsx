'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin } from 'lucide-react'

// Mapbox v3 wires up its internal authenticator at module-eval time. The
// previous shape — setting `mapboxgl.accessToken` inside useEffect — was
// too late and threw "Neither apiKey nor config.authenticator provided"
// before the effect ever ran. Set the token at module scope so it's there
// before the first `new mapboxgl.Map()` call.
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN
}

interface ListingMapProps {
  lat: number
  lng: number
  neighborhood: string | null
}

export function ListingMap({ lat, lng, neighborhood }: ListingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    // Bail cleanly if no token — render a styled placeholder instead of
    // letting Mapbox throw. Surfaces a missing env var as a graceful
    // degradation rather than a crashed listing page.
    if (!MAPBOX_TOKEN) return
    if (map.current || !mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [lng, lat],
      zoom: 14,
    })

    // Add a blurred circle instead of exact pin for privacy
    map.current.on('load', () => {
      if (!map.current) return
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

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [lat, lng])

  // Token-missing fallback — neighborhood pill on a muted backdrop, no
  // hard crash. Lets the listing page still render in environments where
  // the Mapbox token is undefined (e.g. preview builds without env vars).
  if (!MAPBOX_TOKEN) {
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
