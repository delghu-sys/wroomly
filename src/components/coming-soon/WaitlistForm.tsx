'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

const LS_KEY = 'wroomly_waitlist_joined'

/**
 * Renter waitlist capture for the supply-only /coming-soon hero. Posts to the
 * real backend (/api/waitlist → renter_waitlist) and persists a "joined" flag
 * to localStorage so returning visitors skip straight to the confirmed state.
 */
export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY)) setStatus('done')
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setError(null)
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'coming-soon' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        setStatus('idle')
        return
      }
      try {
        localStorage.setItem(LS_KEY, '1')
      } catch {
        /* ignore */
      }
      setStatus('done')
    } catch {
      setError('Network error. Please try again.')
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <div
        aria-live="polite"
        className="w-full max-w-[28rem] mx-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-white/[0.07] border border-white/14 px-5 py-3.5 text-white/90 text-[0.9375rem] font-medium"
      >
        <CheckCircle2
          className="w-5 h-5 shrink-0 text-maize"
          strokeWidth={2}
          aria-hidden
        />
        You’re on the list — see you soon.
      </div>
    )
  }

  return (
    <div className="w-full max-w-[28rem] mx-auto">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Your .edu email"
          aria-label="Email address"
          className="h-[3.125rem] w-full rounded-[0.875rem] border-[1.5px] border-white/28 bg-white/[0.11] backdrop-blur-[10px] px-4 text-white text-[0.9375rem] placeholder:text-white/30 transition focus:outline-none focus:border-maize focus:ring-2 focus:ring-[oklch(0.86_0.17_92/0.18)]"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="h-[3.125rem] w-full rounded-[0.875rem] bg-maize text-[oklch(0.22_0.075_256)] font-semibold text-[0.9375rem] inline-flex items-center justify-center gap-2 shadow-[0_4px_18px_oklch(0.86_0.17_92/0.30)] hover:shadow-[0_10px_36px_oklch(0.86_0.17_92/0.45)] transition disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {status === 'loading' ? (
            'Joining…'
          ) : (
            <>
              Notify me when it opens
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
            </>
          )}
        </button>
      </form>
      {error && (
        <p className="text-[oklch(0.80_0.15_25)] text-xs mt-2.5 text-center">
          {error}
        </p>
      )}
      <p className="text-white/[0.26] text-xs mt-3 text-center">
        No spam. Unsubscribe any time.
      </p>
    </div>
  )
}
