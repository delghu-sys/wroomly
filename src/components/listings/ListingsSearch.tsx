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
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md bg-navy/8 flex items-center justify-center pointer-events-none group-focus-within:bg-navy/15 transition-colors">
        <Search className="w-3.5 h-3.5 text-navy" />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={submit}
        placeholder="Search by name, neighborhood, residence..."
        className="h-12 w-full rounded-2xl border border-line bg-surface pl-12 pr-10 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/30 shadow-soft ease-smooth transition-all"
      />
      {value && (
        <button
          onClick={clear}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-ink-muted/15 flex items-center justify-center hover:bg-ink-muted/25 ease-smooth transition-colors"
        >
          <X className="w-3.5 h-3.5 text-ink-muted" />
        </button>
      )}
    </div>
  )
}
