'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface ListingMapProps {
  lat: number
  lng: number
  neighborhood: string | null
}

export function ListingMap({ lat, lng, neighborhood }: ListingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

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
