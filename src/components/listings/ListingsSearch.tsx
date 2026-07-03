'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'

interface ListingsSearchProps {
  currentQuery?: string
}

export function ListingsSearch({ currentQuery }: ListingsSearchProps) {
  const [value, setValue] = useState(currentQuery ?? '')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const submit = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    const trimmed = value.trim()
    if (trimmed) {
      params.set('q', trimmed)
    } else {
      params.delete('q')
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [value, pathname, searchParams, router])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') submit()
  }

  function clear() {
    setValue('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="relative group flex-1 max-w-xl">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md bg-[oklch(0.84_0.17_85/0.15)] flex items-center justify-center pointer-events-none group-focus-within:bg-[oklch(0.84_0.17_85/0.30)] transition-colors">
        <Search className="w-3.5 h-3.5 text-[oklch(0.84_0.17_85)]" />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={submit}
        aria-label="Search listings by name, neighborhood, or residence"
        placeholder="Search by name, neighborhood, residence…"
        className="h-12 w-full rounded-full border border-white/[0.10] bg-white/[0.05] backdrop-blur pl-12 pr-10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[oklch(0.84_0.17_85/0.50)] focus:border-[oklch(0.84_0.17_85/0.40)] transition-all duration-300"
      />
      {value && (
        <button
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white/70" />
        </button>
      )}
    </div>
  )
}
