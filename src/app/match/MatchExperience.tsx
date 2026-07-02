'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { MatchProfile } from '@/types/database'
import { ATTR_LABELS } from '@/lib/match/profile'
import { GREETING_TEXT, GREETING_CHIPS } from '@/lib/match/greeting'

/**
 * Wroomly Match — the renter-facing experience. Four states on one page (intro →
 * concierge chat → confirm/email → done). The chat is the concierge LLM,
 * token-streamed from /api/match/chat; it decides its own next question and
 * quick-reply chips, so there's no hard-coded script. The finished transcript is
 * distilled into a weighted profile (ranked priorities, dealbreakers,
 * flexibility) shown on the confirm screen.
 */

type Screen = 'intro' | 'chat' | 'summary' | 'done'

interface UiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
)

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

export function MatchExperience() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [multi, setMulti] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [typing, setTyping] = useState(false)
  const [busy, setBusy] = useState(false) // a turn is streaming
  const [finished, setFinished] = useState(false)
  const [input, setInput] = useState('')

  const [profile, setProfile] = useState<MatchProfile | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesRef = useRef<HTMLDivElement>(null)
  const assistantCount = messages.filter(m => m.role === 'assistant').length
  // The concierge runs ~8–12 exchanges; creep toward 90% and land at 100.
  const pct = finished ? 100 : Math.min(10 + assistantCount * 8, 90)

  const scrollDown = useCallback(() => {
    const el = messagesRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollDown()
  }, [messages, typing, chips, scrollDown])

  /** Roles+content the API expects (drops UI ids). */
  function toHistory(msgs: UiMessage[]): { role: 'user' | 'assistant'; content: string }[] {
    return msgs.map(m => ({ role: m.role, content: m.content }))
  }

  /**
   * The model is told plain-text-only, but **bold** still slips through —
   * render it as <strong> instead of showing literal asterisks.
   */
  function renderAssistant(text: string): React.ReactNode {
    const parts = text.split(/\*\*([^*]+)\*\*/g)
    if (parts.length === 1) return text
    return parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p))
  }

  /** Run one assistant turn: stream the message, then surface chips / finish. */
  const runTurn = useCallback(
    async (history: UiMessage[]) => {
      setBusy(true)
      setChips([])
      setSelected([])
      setTyping(true)
      setError(null)

      try {
        const res = await fetch('/api/match/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: toHistory(history) }),
        })
        if (!res.ok || !res.body) throw new Error('chat failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        let assistantId: string | null = null
        let endChips: string[] = []
        let endMulti = false
        let endFinished = false

        const append = (id: string, text: string) =>
          setMessages(prev =>
            prev.map(m => (m.id === id ? { ...m, content: m.content + text } : m)),
          )

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          let nl: number
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).trim()
            buf = buf.slice(nl + 1)
            if (!line) continue
            let frame: { t: string; v?: string; chips?: string[]; multi?: boolean; finished?: boolean }
            try {
              frame = JSON.parse(line)
            } catch {
              continue
            }
            if (frame.t === 'error') {
              throw new Error(frame.v ?? 'chat failed')
            }
            if (frame.t === 'chunk' && frame.v) {
              if (!assistantId) {
                assistantId = crypto.randomUUID()
                setTyping(false)
                const id = assistantId
                setMessages(prev => [...prev, { id, role: 'assistant', content: '' }])
              }
              append(assistantId, frame.v)
            } else if (frame.t === 'end') {
              endChips = frame.chips ?? []
              endMulti = frame.multi ?? false
              endFinished = frame.finished ?? false
            }
          }
        }

        // Safety: ensure a bubble exists even if no chunk arrived.
        if (!assistantId) {
          const id = crypto.randomUUID()
          setMessages(prev => [...prev, { id, role: 'assistant', content: 'Got it!' }])
        }
        setTyping(false)

        if (endFinished) {
          setFinished(true)
          // Let the closing message land, then summarize from the live snapshot.
          setTimeout(() => void summarize(), 800)
        } else {
          setChips(endChips)
          setMulti(endMulti)
        }
      } catch {
        setTyping(false)
        setError('The assistant hit a snag. Please try again.')
      } finally {
        setBusy(false)
      }
    },
    // summarize is stable via useCallback below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  /** Distill the finished conversation into the weighted profile + tags. */
  const summarize = useCallback(async () => {
    try {
      const history = toHistory(messagesSnapshot())
      const res = await fetch('/api/match/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      if (res.ok) {
        const data = (await res.json()) as { profile: MatchProfile; tags: string[] }
        setProfile(data.profile)
        setTags(data.tags)
      }
    } catch {
      // Non-fatal — they can still give their email; we'll save whatever we have.
    } finally {
      setScreen('summary')
    }
  }, [])

  // messages is closed-over staleness-prone inside async; keep a live snapshot.
  const liveMessages = useRef<UiMessage[]>([])
  useEffect(() => {
    liveMessages.current = messages
  }, [messages])
  function messagesSnapshot(): UiMessage[] {
    return liveMessages.current
  }

  /**
   * Open the chat on the deterministic greeting with no model call — the renter
   * sees the first question instantly instead of waiting ~5s for turn zero. The
   * greeting is a real assistant message in the transcript, so the model picks
   * up the thread when the renter answers.
   */
  function openWithGreeting() {
    setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: GREETING_TEXT }])
    setChips(GREETING_CHIPS)
    setMulti(false)
    setSelected([])
    setFinished(false)
    setInput('')
  }

  function startChat() {
    setScreen('chat')
    openWithGreeting()
  }

  function resetChat() {
    setScreen('chat')
    setProfile(null)
    setTags([])
    openWithGreeting()
  }

  function sendUser(text: string) {
    const value = text.trim()
    if (!value || busy) return
    const userMsg: UiMessage = { id: crypto.randomUUID(), role: 'user', content: value }
    const next = [...messagesSnapshot(), userMsg]
    setMessages(next)
    setInput('')
    setChips([])
    setSelected([])
    void runTurn(next)
  }

  function tapChip(label: string) {
    if (multi) {
      setSelected(prev =>
        prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label],
      )
    } else {
      sendUser(label)
    }
  }

  function confirmMulti() {
    if (selected.length === 0) return
    sendUser(selected.join(', '))
  }

  async function handleNotify() {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/match/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          profile,
          transcript: toHistory(messagesSnapshot()),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not set up your alert. Please try again.')
        setSubmitting(false)
        return
      }
      if (Array.isArray(data.tags) && data.tags.length) setTags(data.tags)
      setScreen('done')
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="wm">
      {screen === 'intro' && <Intro onStart={startChat} />}

      {screen === 'chat' && (
        <div className="wm-screen wm-chat">
          <Atmo variant="chat" />
          <nav className="navbar" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Logo white />
              <span className="nav-tag">/ Match</span>
            </div>
          </nav>

          <div className="progress-track" style={{ zIndex: 2 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="step-row">
            <span className="step-label">{finished ? 'All set' : `Question ${Math.max(assistantCount, 1)}`}</span>
            <span className="step-pct">{pct}%</span>
          </div>

          <div className="messages" ref={messagesRef}>
            {messages.map(m =>
              m.role === 'assistant' ? (
                <div className="msg-row ai" key={m.id}>
                  <div className="ai-av">W</div>
                  <div className="bubble ai">{renderAssistant(m.content)}</div>
                </div>
              ) : (
                <div className="msg-row user" key={m.id}>
                  <div className="bubble user">{m.content}</div>
                </div>
              ),
            )}
            {typing && (
              <div className="typing-row">
                <div className="ai-av">W</div>
                <div className="typing-bubble">
                  <span className="td" /><span className="td" /><span className="td" />
                </div>
              </div>
            )}
          </div>

          <div className="chat-foot">
            {chips.length > 0 && (
              <div className="chips-wrap">
                {chips.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`chip${multi && selected.includes(c) ? ' sel' : ''}`}
                    onClick={() => tapChip(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            {multi && selected.length > 0 && (
              <button type="button" className="multi-confirm" onClick={confirmMulti}>
                Those are my must-haves <ArrowRight />
              </button>
            )}
            <div className="input-row">
              <input
                className="chat-input"
                type="text"
                placeholder="Type your answer…"
                value={input}
                disabled={busy}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') sendUser(input)
                }}
                aria-label="Your message"
              />
              <button
                type="button"
                className="send-btn"
                onClick={() => sendUser(input)}
                disabled={busy || !input.trim()}
                aria-label="Send"
              >
                <ArrowRight />
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'summary' && (
        <div className="wm-screen wm-summary">
          <nav className="navbar navbar-light">
            <Logo />
          </nav>
          <main className="summary-main">
            <div className="summary-card">
              <p className="s-eyebrow">Your match brief</p>
              <h2 className="s-h2">Here&rsquo;s what I&rsquo;ll watch for</h2>

              {profile?.summary && <p className="s-summary">{profile.summary}</p>}

              {profile && profile.priorities.length > 0 && (
                <div className="s-prios">
                  {profile.priorities.map((p, i) => (
                    <span className="s-prio" key={p}>
                      <span className="s-prio-rank">{i + 1}</span>
                      {ATTR_LABELS[p]}
                    </span>
                  ))}
                </div>
              )}

              <div className="criteria-wrap">
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

              {profile && profile.dealbreakers.length > 0 && (
                <div className="s-dealbreakers">
                  {profile.dealbreakers.map(d => (
                    <span className="s-db" key={d.attr + d.description}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      {d.description}
                    </span>
                  ))}
                </div>
              )}

              <div className="s-divider" />

              <p className="s-ask">Where should we send matches?</p>
              <p className="s-hint">
                Ranked matches with an honest read on each — only when something genuinely
                fits. You&rsquo;re also first in line when Wroomly opens to renters.
              </p>

              <input
                type="email"
                className="s-email"
                placeholder="you@email.com"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleNotify()
                }}
                aria-label="Your email address"
              />

              <button type="button" className="btn-notify" onClick={() => void handleNotify()} disabled={submitting}>
                {submitting ? 'Setting up…' : 'Notify me when a match drops'}
                {!submitting && <ArrowRight />}
              </button>

              {error && <p className="s-error">{error}</p>}
              <p className="s-legal">Single opt-in. Unsubscribe any time.</p>
              <div style={{ textAlign: 'center' }}>
                <button type="button" className="s-back" onClick={resetChat}>
                  Change my preferences
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {screen === 'done' && (
        <div className="wm-screen wm-done">
          <nav className="navbar navbar-light">
            <Logo />
          </nav>
          <main className="done-main">
            <div className="done-inner">
              <div className="done-check" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="oklch(0.22 0.075 256)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="done-h2">You&rsquo;re all set.</h2>
              <p className="done-sub">
                I&rsquo;ll email you the moment a place that fits shows up on Wroomly. You&rsquo;ll be among the first to know.
              </p>
              <div className="done-tags">
                {tags.map(t => (
                  <span className="done-tag" key={t}>{t}</span>
                ))}
              </div>
              <button type="button" className="done-edit" onClick={() => setScreen('summary')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                Edit preferences
              </button>
            </div>
          </main>
        </div>
      )}
    </div>
  )
}

function Logo({ white = false }: { white?: boolean }) {
  return (
    <Link href="/" className="logo" aria-label="Wroomly home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Wroomly" width={26} height={26} />
      <span className={`logo-word ${white ? 'logo-white' : 'logo-dark'}`}>wroomly</span>
    </Link>
  )
}

function Atmo({ variant }: { variant: 'intro' | 'chat' }) {
  return (
    <div className="atmo" aria-hidden="true">
      <div className="noise" />
      {variant === 'intro' ? (
        <>
          <div className="blob" style={{ top: '-8%', left: '4%', width: 640, height: 640, background: 'oklch(0.22 0.06 265)', filter: 'blur(140px)', opacity: 0.3, animation: 'wm-float-a 14s ease-in-out infinite' }} />
          <div className="blob" style={{ bottom: '4%', right: '6%', width: 520, height: 520, background: 'oklch(0.84 0.17 85 / 0.35)', filter: 'blur(120px)', opacity: 0.18, animation: 'wm-float-b 10s ease-in-out infinite 2s' }} />
          <div className="blob" style={{ top: '42%', right: '30%', width: 280, height: 280, background: 'oklch(0.50 0.10 280)', filter: 'blur(100px)', opacity: 0.1 }} />
        </>
      ) : (
        <>
          <div className="blob" style={{ top: '-12%', left: '-4%', width: 520, height: 520, background: 'oklch(0.22 0.06 265)', filter: 'blur(140px)', opacity: 0.24 }} />
          <div className="blob" style={{ bottom: '12%', right: '2%', width: 400, height: 400, background: 'oklch(0.84 0.17 85 / 0.28)', filter: 'blur(110px)', opacity: 0.14 }} />
        </>
      )}
    </div>
  )
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="wm-screen wm-intro">
      <Atmo variant="intro" />
      <nav className="navbar">
        <Logo white />
      </nav>
      <main className="intro-main">
        <div className="intro-content">
          <div className="intro-badge">
            <span className="badge-dot" aria-hidden="true" />
            AI-powered matching
          </div>
          <h1 className="intro-h1">
            Talk to someone who<br />
            <em>gets Ann Arbor housing.</em>
          </h1>
          <p className="intro-sub">
            A few minutes with our housing concierge — it learns what actually matters to you,
            then emails you ranked matches with an honest read on each. Free, always.
          </p>
          <button className="btn-start" onClick={onStart} aria-label="Start chatting with Wroomly Match">
            Start chatting <ArrowRight />
          </button>
          <div className="intro-trust" aria-label="Why Wroomly Match">
            <span className="trust-item">Free</span>
            <span className="trust-sep" aria-hidden="true" />
            <span className="trust-item">No account needed</span>
            <span className="trust-sep" aria-hidden="true" />
            <span className="trust-item">Built for Ann Arbor</span>
          </div>
        </div>
      </main>
    </div>
  )
}
