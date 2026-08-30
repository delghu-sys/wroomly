'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

/**
 * Clickwrap re-acceptance gate.
 *
 * Mounted in the app layout. Asks the server whether the signed-in user has
 * an acceptance row for the CURRENT policy versions; if not, overlays a
 * blocking prompt until they affirmatively accept. Fires for two groups:
 * users who predate clickwrap entirely, and everyone after a version bump in
 * src/lib/legal.ts (the Terms promise 14 days' notice before a material bump).
 *
 * Deliberately cannot be dismissed without accepting — a dismissable prompt
 * is browsewrap with extra steps, which is exactly what courts decline to
 * enforce.
 */
export function LegalReacceptance() {
  const [needed, setNeeded] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/legal/accept')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!cancelled && d && d.authenticated && d.current === false) {
          setNeeded(true)
        }
      })
      .catch(() => {
        // Network hiccup: never block the app on a failed check.
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!needed) return null

  async function accept() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/legal/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: 'reacceptance' }),
      })
      if (!res.ok) throw new Error('failed')
      setNeeded(false)
    } catch {
      setError('Could not save your acceptance. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Updated terms"
    >
      <div className="absolute inset-0 bg-navy-deep/40 backdrop-blur-sm" aria-hidden />
      <div
        className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-7"
        style={{ boxShadow: 'var(--shadow-overlay)' }}
      >
        <p className="text-[10.5px] uppercase tracking-[0.18em] text-ink-muted font-semibold">
          Before you continue
        </p>
        <h2 className="font-display text-2xl tracking-tight text-ink mt-1.5">
          Our terms have been updated
        </h2>
        <p className="text-sm text-ink-soft leading-relaxed mt-3">
          To keep using Wroomly, please review and accept the current{' '}
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline underline-offset-4 hover:text-gold-deep">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline underline-offset-4 hover:text-gold-deep">
            Privacy Policy
          </Link>
          .
        </p>

        <label className="mt-5 flex items-start gap-2.5 cursor-pointer select-none">
          <Checkbox
            checked={agreed}
            onCheckedChange={c => setAgreed(c === true)}
            className="mt-0.5 data-[state=checked]:bg-navy-deep data-[state=checked]:border-navy-deep"
          />
          <span className="text-sm text-ink-soft leading-snug">
            I am 18 or older and I agree to the Terms of Service and Privacy
            Policy.
          </span>
        </label>

        {error && (
          <p className="text-xs text-[oklch(0.55_0.20_25)] mt-2">{error}</p>
        )}

        <button
          type="button"
          disabled={!agreed || saving}
          onClick={accept}
          className="press mt-5 w-full h-11 rounded-full bg-navy-deep text-maize-bright font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-glow-navy disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Accept and continue
        </button>
      </div>
    </div>
  )
}
