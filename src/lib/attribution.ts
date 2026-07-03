import type { NextRequest, NextResponse } from 'next/server'

/**
 * First-touch acquisition attribution.
 *
 * A visitor landing with ?ref=<slug> (ambassador links, flyer QRs) or
 * ?utm_source=<slug> gets a 30-day cookie recording that first source.
 * /callback copies it onto users.signup_source at account creation
 * (migration 030); the waitlist API enriches its `source` field with it.
 * First-touch wins: an existing cookie is never overwritten, so a student
 * who scanned a rep's flyer last week still credits that rep when they
 * sign up from a Google search today.
 */

export const ATTRIBUTION_COOKIE = 'wroomly_attr'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

// Slugs only — anything else is dropped, not escaped, so junk and injection
// attempts never reach the database or the dashboard.
const VALID_SOURCE = /^[a-zA-Z0-9_-]{1,64}$/

export function sanitizeSource(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim().toLowerCase()
  return VALID_SOURCE.test(trimmed) ? trimmed : null
}

/**
 * If the request carries a new first-touch source, set the attribution
 * cookie on the outgoing response. Safe to call on any middleware response
 * (including redirects — the supply-only gate must not eat flyer refs).
 */
export function withAttribution<T extends NextResponse>(
  request: NextRequest,
  response: T
): T {
  if (request.cookies.get(ATTRIBUTION_COOKIE)?.value) return response // first touch wins

  const params = request.nextUrl.searchParams
  const source = sanitizeSource(params.get('ref')) ?? sanitizeSource(params.get('utm_source'))
  if (!source) return response

  response.cookies.set(ATTRIBUTION_COOKIE, source, {
    maxAge: MAX_AGE_SECONDS,
    path: '/',
    httpOnly: true, // read server-side only (/callback, /api/waitlist)
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
