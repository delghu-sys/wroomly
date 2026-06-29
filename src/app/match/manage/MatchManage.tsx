'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MatchAlertStatus, MatchFrequency } from '@/types/database'

/**
 * Tokenized manage page for a Wroomly Match alert — no login. Lets a renter
 * change cadence, pause/resume, unsubscribe, or re-run the chat to redo their
 * criteria. All writes go through PATCH /api/match/alerts/[token].
 */
interface Props {
  token: string
  email: string
  tags: string[]
  initialStatus: MatchAlertStatus
  initialFrequency: MatchFrequency
  justUnsubscribed: boolean
}

export function MatchManage({
  token,
  email,
  tags,
  initialStatus,
  initialFrequency,
  justUnsubscribed,
}: Props) {
  const [status, setStatus] = useState<MatchAlertStatus>(initialStatus)
  const [frequency, setFrequency] = useState<MatchFrequency>(initialFrequency)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(
    justUnsubscribed ? 'You’ve been unsubscribed. You won’t get any more match emails.' : null,
  )

  async function patch(body: Record<string, unknown>, okNote: string) {
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch(`/api/match/alerts/${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setNote('Something went wrong. Please try again.')
        return
      }
      setNote(okNote)
    } catch {
      setNote('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  function changeFrequency(f: MatchFrequency) {
    setFrequency(f)
    void patch({ frequency: f }, f === 'instant' ? 'Now emailing you the moment a place matches.' : 'Switched to a once-daily digest.')
  }

  function togglePause() {
    const next: MatchAlertStatus = status === 'paused' ? 'active' : 'paused'
    setStatus(next)
    void patch({ status: next }, next === 'paused' ? 'Alerts paused — we won’t email you until you resume.' : 'Alerts resumed.')
  }

  function unsubscribe() {
    setStatus('unsubscribed')
    void patch({ status: 'unsubscribed' }, 'You’ve been unsubscribed.')
  }

  const unsubscribed = status === 'unsubscribed'

  return (
    <div className="wm">
      <div className="wm-screen wm-summary">
        <nav className="navbar navbar-light">
          <Link href="/" className="logo" aria-label="Wroomly home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Wroomly" width={26} height={26} />
            <span className="logo-word logo-dark">wroomly</span>
          </Link>
        </nav>

        <main className="summary-main">
          <div className="summary-card">
            <p className="s-eyebrow">Wroomly Match</p>
            <h2 className="s-h2">Your match preferences</h2>
            <p className="s-hint" style={{ marginTop: '-0.5rem' }}>
              Saved for <strong>{email}</strong>
            </p>

            <div className="criteria-wrap" style={{ marginTop: '1rem' }}>
              {tags.length > 0 ? (
                tags.map(t => (
                  <span className="c-tag" key={t}>
                    <span className="c-dot" aria-hidden="true" />
                    {t}
                  </span>
                ))
              ) : (
                <span className="c-tag">
                  <span className="c-dot" aria-hidden="true" />
                  Any new Ann Arbor listing
                </span>
              )}
            </div>

            <div className="s-divider" />

            {unsubscribed ? (
              <p className="s-hint">
                You’re unsubscribed and won’t receive match emails. Changed your mind?{' '}
                <Link href="/match" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
                  Start a new alert
                </Link>
                .
              </p>
            ) : (
              <>
                <p className="s-ask">How often should we email you?</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className={`chip${frequency === 'instant' ? ' sel' : ''}`}
                    style={{ color: frequency === 'instant' ? 'var(--navy)' : 'var(--ink-soft)', background: frequency === 'instant' ? 'var(--maize)' : 'white', borderColor: 'var(--line)' }}
                    onClick={() => changeFrequency('instant')}
                    disabled={busy}
                  >
                    Instantly
                  </button>
                  <button
                    type="button"
                    className={`chip${frequency === 'daily' ? ' sel' : ''}`}
                    style={{ color: frequency === 'daily' ? 'var(--navy)' : 'var(--ink-soft)', background: frequency === 'daily' ? 'var(--maize)' : 'white', borderColor: 'var(--line)' }}
                    onClick={() => changeFrequency('daily')}
                    disabled={busy}
                  >
                    Daily digest
                  </button>
                </div>

                <Link href="/match" className="btn-notify" style={{ textDecoration: 'none', marginBottom: '0.75rem' }}>
                  Redo my preferences
                </Link>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                  <button type="button" className="s-back" onClick={togglePause} disabled={busy}>
                    {status === 'paused' ? 'Resume alerts' : 'Pause alerts'}
                  </button>
                  <span style={{ color: 'var(--line)' }}>·</span>
                  <button type="button" className="s-back" onClick={unsubscribe} disabled={busy}>
                    Unsubscribe
                  </button>
                </div>
              </>
            )}

            {note && <p className="s-legal" style={{ marginTop: '1rem' }}>{note}</p>}
          </div>
        </main>
      </div>
    </div>
  )
}
