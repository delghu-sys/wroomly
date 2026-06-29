import { NextResponse } from 'next/server'
import { unsubscribeByToken } from '@/lib/match/alerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Unsubscribe from Wroomly Match alerts via the manage token (no login).
 *
 *  GET  — the clickable link in the email footer. Flips status, then redirects
 *         to the manage page with a confirmation flag so the user sees it stuck.
 *  POST — RFC 8058 one-click (the `List-Unsubscribe-Post` header). Mail clients
 *         POST this directly; we return 200 with no redirect.
 *
 * Idempotent and fail-safe: an unknown/expired token still returns success-ish
 * (we never reveal whether a token exists), and a real one is unsubscribed
 * immediately so we honor opt-outs without delay.
 */
function tokenFrom(request: Request): string {
  return new URL(request.url).searchParams.get('token') ?? ''
}

export async function GET(request: Request) {
  const token = tokenFrom(request)
  await unsubscribeByToken(token)
  const url = new URL(request.url)
  const dest = new URL('/match/manage', url.origin)
  if (token) dest.searchParams.set('token', token)
  dest.searchParams.set('unsubscribed', '1')
  return NextResponse.redirect(dest)
}

export async function POST(request: Request) {
  await unsubscribeByToken(tokenFrom(request))
  return NextResponse.json({ ok: true })
}
