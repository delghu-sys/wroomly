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
          'circle-radius': 60,
          'circle-color': '#1d4ed8',
          'circle-opacity': 0.2,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#1d4ed8',
          'circle-stroke-opacity': 0.4,
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
      <div ref={mapContainer} className="h-56 rounded-xl overflow-hidden" />
      {neighborhood && (
        <p className="text-sm text-gray-500">
          Approximate location in <span className="font-medium text-gray-700">{neighborhood}</span>.
          Exact address shared after booking.
        </p>
      )}
    </div>
  )
}
