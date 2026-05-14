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
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={submit}
        placeholder="Search listings..."
        className="h-10 w-48 sm:w-56 rounded-full border border-line bg-surface pl-9 pr-8 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/40 transition-all"
      />
      {value && (
        <button
          onClick={clear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-ink-muted/20 flex items-center justify-center hover:bg-ink-muted/30 transition-colors"
        >
          <X className="w-3 h-3 text-ink-muted" />
        </button>
      )}
    </div>
  )
}
