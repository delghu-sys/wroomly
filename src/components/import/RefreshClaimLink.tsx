'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * On the expired-link page: ask for a fresh link instead of re-importing.
 * The new link goes to the address the draft was imported with (see
 * /api/listing-imports/refresh), so this button never reveals anything.
 */
export function RefreshClaimLink({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function send() {
    setState('sending')
    try {
      const res = await fetch('/api/listing-imports/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Could not send a new link.')
      setMessage(json.message ?? 'A fresh link is on its way.')
      setState('done')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not send a new link.')
      setState('error')
    }
  }

  if (state === 'done') {
    return <p className="text-[14px] text-ink-soft" role="status">{message} Check your inbox, and your spam folder.</p>
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={send}
        disabled={state === 'sending'}
        className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-navy-deep text-maize-bright font-semibold text-sm hover:bg-navy-deep/90 transition disabled:opacity-60"
      >
        {state === 'sending' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
        Email me a fresh link
      </button>
      {state === 'error' && <p className="text-[13px] text-[oklch(0.55_0.18_25)]" role="alert">{message}</p>}
    </div>
  )
}
