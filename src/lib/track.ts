'use client'

// Fire-and-forget first-party funnel events → /api/events → analytics_events
// (migration 031). Never awaited in UI paths, never throws, no-ops on any
// failure — measurement must never affect the product.
//
// Event names are allowlisted server-side; add new ones in
// src/app/api/events/route.ts EVENT_NAMES first.

const SESSION_KEY = 'wroomly_evt_session'

function sessionId(): string | undefined {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return undefined // private mode / storage blocked — events stay anonymous
  }
}

export function track(
  name: string,
  props: Record<string, string | number | boolean> = {},
): void {
  try {
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, props, sessionId: sessionId() }),
      // Survives navigation right after the call (e.g. publish → redirect).
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* never let measurement break the product */
  }
}
