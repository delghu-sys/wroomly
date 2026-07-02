'use client'

import { useState } from 'react'
import Link from 'next/link'
import type {
  MatchAlertStatus,
  MatchAttr,
  MatchFrequency,
  MatchProfile,
} from '@/types/database'
import { ATTR_LABELS } from '@/lib/match/profile'

/**
 * Tokenized manage page for a Wroomly Match alert — no login. Shows the
 * weighted concierge profile (summary, ranked priorities, dealbreakers,
 * importance sliders) and the recent matches we emailed with their thumbs
 * state. Lets the renter tune weights, change cadence, pause/resume,
 * unsubscribe, or re-run the concierge chat to rebuild the profile. All
 * writes go through PATCH /api/match/alerts/[token].
 */

export interface SentMatch {
  id: string
  listingId: string
  title: string
  score: number | null
  note: string | null
  feedback: 'up' | 'down' | null
  emailedAt: string
}

interface Props {
  token: string
  email: string
  profile: MatchProfile
  tags: string[]
  history: SentMatch[]
  initialStatus: MatchAlertStatus
  initialFrequency: MatchFrequency
  justUnsubscribed: boolean
}

export function MatchManage({
  token,
  email,
  profile,
  tags,
  history,
  initialStatus,
  initialFrequency,
  justUnsubscribed,
}: Props) {
  const [status, setStatus] = useState<MatchAlertStatus>(initialStatus)
  const [frequency, setFrequency] = useState<MatchFrequency>(initialFrequency)
  const [weights, setWeights] = useState<Partial<Record<MatchAttr, number>>>(profile.weights)
  const [weightsDirty, setWeightsDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(
    justUnsubscribed ? 'You’ve been unsubscribed. You won’t get any more match emails.' : null,
  )

  async function patch(body: Record<string, unknown>, okNote: string): Promise<boolean> {
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
        return false
      }
      setNote(okNote)
      return true
    } catch {
      setNote('Network error — please try again.')
      return false
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

  function setWeight(attr: MatchAttr, value: number) {
    setWeights(prev => ({ ...prev, [attr]: value }))
    setWeightsDirty(true)
  }

  async function saveWeights() {
    const ok = await patch(
      { profile: { ...profile, weights } },
      'Importance updated — future matches will score with your new weights.',
    )
    if (ok) setWeightsDirty(false)
  }

  const unsubscribed = status === 'unsubscribed'
  const weightAttrs = (Object.keys(ATTR_LABELS) as MatchAttr[]).filter(
    a => weights[a] != null,
  )

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
            <h2 className="s-h2">Your match profile</h2>
            <p className="s-hint" style={{ marginTop: '-0.5rem' }}>
              Saved for <strong>{email}</strong>
            </p>

            {profile.summary && (
              <p className="s-summary" style={{ marginTop: '0.75rem' }}>{profile.summary}</p>
            )}

            {profile.priorities.length > 0 && (
              <div className="s-prios">
                {profile.priorities.map((p, i) => (
                  <span className="s-prio" key={p}>
                    <span className="s-prio-rank">{i + 1}</span>
                    {ATTR_LABELS[p]}
                  </span>
                ))}
              </div>
            )}

            <div className="criteria-wrap" style={{ marginTop: '0.5rem' }}>
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

            {profile.dealbreakers.length > 0 && (
              <div className="s-dealbreakers">
                {profile.dealbreakers.map(d => (
                  <span className="s-db" key={d.attr + d.description}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    {d.description}
                  </span>
                ))}
              </div>
            )}

            {!unsubscribed && weightAttrs.length > 0 && (
              <>
                <div className="s-divider" />
                <p className="s-ask">What matters most</p>
                <p className="s-hint">
                  Drag to re-weight. Your 👍 / 👎 on emailed matches tunes these too.
                </p>
                <div className="w-sliders">
                  {weightAttrs.map(attr => (
                    <label className="w-row" key={attr}>
                      <span className="w-label">{ATTR_LABELS[attr]}</span>
                      <input
                        type="range"
                        min={0.05}
                        max={1}
                        step={0.05}
                        value={weights[attr] ?? 0.5}
                        onChange={e => setWeight(attr, Number(e.target.value))}
                        aria-label={`Importance of ${ATTR_LABELS[attr]}`}
                      />
                      <span className="w-val">{Math.round((weights[attr] ?? 0.5) * 100)}%</span>
                    </label>
                  ))}
                </div>
                {weightsDirty && (
                  <button type="button" className="btn-notify" onClick={() => void saveWeights()} disabled={busy} style={{ marginTop: '0.75rem' }}>
                    {busy ? 'Saving…' : 'Save importance'}
                  </button>
                )}
              </>
            )}

            <div className="s-divider" style={{ marginTop: '1.25rem' }} />

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
                  Re-chat to refine my profile
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

          {history.length > 0 && (
            <div className="summary-card" style={{ marginTop: '1rem' }}>
              <p className="s-eyebrow">Matches we&rsquo;ve sent</p>
              <div className="h-list">
                {history.map(h => (
                  <div className="h-row" key={h.id}>
                    <div className="h-head">
                      <Link href={`/listings/${h.listingId}`} className="h-title">
                        {h.title}
                      </Link>
                      <span className="h-side">
                        {h.feedback && (
                          <span className="h-thumb" title={h.feedback === 'up' ? 'You liked this' : 'Not for you'}>
                            {h.feedback === 'up' ? '👍' : '👎'}
                          </span>
                        )}
                        {h.score != null && <span className="h-score">{h.score}%</span>}
                      </span>
                    </div>
                    {h.note && <p className="h-note">{h.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
