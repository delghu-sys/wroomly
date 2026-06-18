'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapListing {
  id: string
  title: string
  lat: number
  lng: number
  price_per_month: number | null
  neighborhood: string | null
  image_url: string | null
}

// Ann Arbor central campus
const AA_CENTER: [number, number] = [42.2780, -83.7430]

function priceLabel(cents: number | null): string {
  if (!cents) return '—'
  const dollars = Math.round(cents / 100)
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1)}k`
  return `$${dollars}`
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function ListingsMap({ listings }: { listings: MapListing[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<LeafletMarker[]>([])

  // Initialize map once
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, {
        center: AA_CENTER,
        zoom: 13,
        scrollWheelZoom: true,
      })

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map)

      mapRef.current = map
    })()

    return () => {
      cancelled = true
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // Render markers when listings change
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      const map = mapRef.current
      if (cancelled || !map) return

      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      const withCoords = listings.filter(
        l => Number.isFinite(l.lat) && Number.isFinite(l.lng)
      )

      // Group listings that share a location (multiple units in one building
      // geocode to the identical point). One pin per location: a single
      // listing shows a price pin; a group shows a count badge whose popup
      // lists every unit. This is the clustering for stacked building units.
      const groups = new Map<string, MapListing[]>()
      for (const l of withCoords) {
        const key = `${l.lat.toFixed(5)},${l.lng.toFixed(5)}`
        const arr = groups.get(key)
        if (arr) arr.push(l)
        else groups.set(key, [l])
      }

      for (const items of groups.values()) {
        const lat = items[0].lat
        const lng = items[0].lng

        if (items.length === 1) {
          const l = items[0]
          const icon = L.divIcon({
            className: '',
            html: `<button type="button" class="mn-price-pin" aria-label="${escapeHtml(l.title)}, ${priceLabel(l.price_per_month)} per month">${priceLabel(l.price_per_month)}</button>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })
          const popupHtml = `
            <div style="width:220px;font-family:inherit">
              ${
                l.image_url
                  ? `<div style="aspect-ratio:4/3;background:#eee;border-radius:8px;overflow:hidden;margin-bottom:8px"><img src="${l.image_url}" alt="" style="width:100%;height:100%;object-fit:cover" /></div>`
                  : ''
              }
              <div style="font-weight:600;color:#111;font-size:13px;line-height:1.3;margin-bottom:4px">${escapeHtml(l.title)}</div>
              ${
                l.neighborhood
                  ? `<div style="font-size:12px;color:#666;margin-bottom:6px">${escapeHtml(l.neighborhood)}</div>`
                  : ''
              }
              <div style="font-size:13px;color:#111;margin-bottom:8px"><strong>${priceLabel(l.price_per_month)}</strong> <span style="color:#666">/month</span></div>
              <a href="/listings/${l.id}" style="display:inline-block;font-size:12px;font-weight:600;color:#1d4ed8;text-decoration:none">View listing →</a>
            </div>
          `
          const marker = L.marker([lat, lng], { icon })
            .addTo(map)
            .bindPopup(popupHtml, { maxWidth: 260, closeButton: true })
          markersRef.current.push(marker)
          continue
        }

        // Grouped pin — count badge + a list of every unit at this location.
        const icon = L.divIcon({
          className: '',
          html: `<button type="button" class="mn-cluster-pin" aria-label="${items.length} listings at this location">${items.length}</button>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        })
        const rows = items
          .map(
            u => `
            <a href="/listings/${u.id}" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #eee;text-decoration:none;color:#111">
              <span style="font-size:12px;line-height:1.3">${escapeHtml(u.title)}</span>
              <span style="font-size:12px;font-weight:700;white-space:nowrap">${priceLabel(u.price_per_month)}</span>
            </a>`
          )
          .join('')
        const popupHtml = `
          <div style="width:248px;font-family:inherit">
            <div style="font-weight:600;color:#111;font-size:13px;margin-bottom:2px">${items.length} listings here</div>
            <div style="font-size:11px;color:#666">Same building — tap one to view</div>
            <div style="max-height:240px;overflow:auto;margin-top:4px">${rows}</div>
          </div>
        `
        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml, { maxWidth: 280, closeButton: true })
        markersRef.current.push(marker)
      }

      const locations = Array.from(groups.values()).map(
        items => [items[0].lat, items[0].lng] as [number, number]
      )
      if (locations.length > 1) {
        map.fitBounds(L.latLngBounds(locations), { padding: [60, 60], maxZoom: 15 })
      } else if (locations.length === 1) {
        map.flyTo(locations[0], 15, { duration: 0.6 })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [listings])

  const withoutCoords = listings.filter(
    l => !Number.isFinite(l.lat) || !Number.isFinite(l.lng)
  ).length

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="w-full h-[calc(100vh-260px)] min-h-[480px] rounded-2xl overflow-hidden border border-line"
      />
      {withoutCoords > 0 && (
        <p className="text-xs text-ink-muted">
          {withoutCoords} listing{withoutCoords === 1 ? '' : 's'} not shown — no map location set.
        </p>
      )}
      <style jsx global>{`
        .mn-price-pin {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          color: #111;
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
          white-space: nowrap;
          cursor: pointer;
          transform: translate(-50%, -50%);
          transition: transform 0.12s ease, background 0.12s ease, color 0.12s ease;
        }
        .mn-price-pin:hover {
          background: #111;
          color: #fff;
          transform: translate(-50%, -50%) scale(1.06);
        }
        .mn-cluster-pin {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 700;
          color: oklch(0.84 0.17 85);
          background: oklch(0.22 0.075 256);
          border: 2px solid #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          cursor: pointer;
          transform: translate(-50%, -50%);
          transition: transform 0.12s ease;
        }
        .mn-cluster-pin:hover {
          transform: translate(-50%, -50%) scale(1.1);
        }
        .leaflet-container {
          font-family: inherit;
          background: #f5f5f0;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
        }
      `}</style>
    </div>
  )
}
