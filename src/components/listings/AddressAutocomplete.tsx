'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { MapPin, Check } from 'lucide-react'

export interface AddressPick {
  address: string
  lat: number
  lng: number
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  type?: string
  address?: {
    house_number?: string
    road?: string
    pedestrian?: string
    neighbourhood?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    state?: string
    postcode?: string
    country?: string
    amenity?: string
    building?: string
    shop?: string
  }
}

function formatAddress(r: NominatimResult): string {
  const a = r.address ?? {}
  const parts: string[] = []
  const street = a.road ?? a.pedestrian
  if (a.house_number && street) parts.push(`${a.house_number} ${street}`)
  else if (street) parts.push(street)
  else if (a.building) parts.push(a.building)
  else if (a.amenity) parts.push(a.amenity)
  const locality = a.city ?? a.town ?? a.village ?? a.suburb
  if (locality) parts.push(locality)
  if (a.state) parts.push(a.state)
  const out = parts.filter(Boolean).join(', ')
  return out || r.display_name
}

export function AddressAutocomplete({
  value,
  hasPick,
  onChange,
  onPick,
  placeholder = '123 Main St',
}: {
  value: string
  hasPick: boolean
  onChange: (v: string) => void
  onPick: (pick: AddressPick) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<NominatimResult[]>([])
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Debounced fetch
  useEffect(() => {
    if (!value || value.trim().length < 3 || hasPick) {
      setResults([])
      return
    }
    const handle = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setLoading(true)
      try {
        const params = new URLSearchParams({
          q: value,
          format: 'json',
          addressdetails: '1',
          limit: '6',
          countrycodes: 'us',
          // Ann Arbor area viewbox (lon_min, lat_max, lon_max, lat_min)
          viewbox: '-83.85,42.36,-83.60,42.18',
          bounded: '0',
        })
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          {
            signal: ctrl.signal,
            headers: { 'Accept-Language': 'en' },
          }
        )
        const json: NominatimResult[] = await res.json()
        const feats = (json ?? []).filter(
          r => r && !isNaN(parseFloat(r.lat)) && !isNaN(parseFloat(r.lon))
        )
        setResults(feats)
        setHighlight(0)
        setOpen(feats.length > 0)
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== 'AbortError') {
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => clearTimeout(handle)
  }, [value, hasPick])

  // Close on click outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function pick(r: NominatimResult) {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    const addr = formatAddress(r)
    onPick({ address: addr, lat, lng })
    setOpen(false)
    setResults([])
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => (h + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => (h - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(results[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={hasPick ? 'pr-9' : ''}
        />
        {hasPick && (
          <Check className="w-4 h-4 text-green-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-md border border-line bg-white shadow-lg"
        >
          {results.map((r, i) => {
            const formatted = formatAddress(r)
            return (
              <li key={`${formatted}-${i}`} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={e => {
                    e.preventDefault()
                    pick(r)
                  }}
                  className={`w-full text-left flex items-start gap-2 px-3 py-2 text-sm ${
                    i === highlight ? 'bg-ink-soft/10' : 'bg-white'
                  } hover:bg-ink-soft/10 transition`}
                >
                  <MapPin className="w-4 h-4 text-ink-muted mt-0.5 shrink-0" />
                  <span className="text-ink truncate">{formatted}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {loading && !open && (
        <p className="text-xs text-ink-muted mt-1">Searching…</p>
      )}
      {!hasPick && value.length >= 3 && !loading && results.length === 0 && (
        <p className="text-xs text-ink-muted mt-1">
          No matches yet — keep typing the full street address.
        </p>
      )}
      {hasPick && (
        <p className="text-xs text-green-700 mt-1">
          Exact location saved. This is what shows on the map.
        </p>
      )}
    </div>
  )
}
