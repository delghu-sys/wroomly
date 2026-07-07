import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { SUPPLY_ONLY_MODE } from '@/lib/config'
import {
  isSupplyOnlyAllowedPath,
  COMING_SOON_PATH,
  BYPASS_COOKIE,
} from '@/lib/supplyOnly'
import { withAttribution } from '@/lib/attribution'

// /list-place is public: it's the "List your place" CTA target and does its own
// auth routing (anon → the public /start-listing chooser; supplier → /listings/new).
// Auth-walling it here would dead-end prospective suppliers on a sign-IN page.
const PUBLIC_ROUTES = ['/', '/listings', '/about', '/terms', '/privacy', '/guides', '/buildings', '/coming-soon', '/start-listing', '/list-place']
// /callback handles the OAuth + email-confirm code exchange — it MUST be
// reachable while logged-out, because it's the request that creates the
// session. Gating it behind auth bounces the user to /sign-in?next=/callback
// before the exchange can run. /forgot-password is likewise pre-auth.
const AUTH_ROUTES = [
  '/sign-in',
  '/sign-up',
  '/verify-email',
  '/forgot-password',
  '/callback',
]
const ADMIN_ROUTES = ['/admin']
const SUPPLIER_ROUTES = ['/my-listings', '/listings/new', '/inquiries', '/payouts']

// SEO: crawler-facing files + public landing-page sections. Without these
// the middleware bounces logged-out requests (including Googlebot) to
// /sign-in — which is exactly why /sitemap.xml was being read as an HTML
// login page in Search Console, and would have made every neighborhood /
// building / guide page invisible to search.
const PUBLIC_FILES = ['/sitemap.xml', '/robots.txt', '/manifest.webmanifest', '/llms.txt']
// /import-listing + /claim-listing/ are public entry points for the AI
// Listing Importer (a visitor may not have an account yet). The claim page
// validates the token server-side; the claim/publish APIs do their own auth.
const PUBLIC_PREFIXES = [
  '/ann-arbor/',
  '/buildings/',
  '/guides/',
  '/import-listing',
  '/claim-listing/',
  // Wroomly Match — public renter demand-capture (chat → email alert), no
  // account needed. Covers /match and /match/manage.
  '/match',
]

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase: sessionClient } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // First-touch acquisition attribution (?ref= / ?utm_source= → 30-day
  // cookie; /callback copies it to users.signup_source). Set on the shared
  // response here so every path that returns it carries the cookie; the
  // supply-only redirect below is wrapped separately so flyer/rep links
  // aren't lost at the /coming-soon gate.
  withAttribution(request, supabaseResponse)

  // Stripe webhook validates its own signature; don't burn an auth lookup
  // or the cookie roundtrip on every event delivery.
  if (pathname === '/api/stripe/webhook') {
    return supabaseResponse
  }

  // Sentry browser tunnel (next.config tunnelRoute). Auth-gating this
  // redirects error envelopes from logged-out visitors to /sign-in → 405,
  // silently losing every anonymous client-side error. Must stay public.
  if (pathname === '/monitoring') {
    return supabaseResponse
  }

  // AI Listing Importer API. /api/listing-imports (create) is intentionally
  // public — a visitor without an account submits here. The claim/publish
  // sub-routes enforce their own auth, so let them through the middleware
  // instead of redirecting unauthenticated POSTs to /sign-in.
  if (pathname.startsWith('/api/listing-imports')) {
    return supabaseResponse
  }

  // Public renter-waitlist endpoint (supply-only). Validates its own input and
  // needs no session, so never gate it behind auth.
  if (pathname.startsWith('/api/waitlist')) {
    return supabaseResponse
  }

  // Anonymous funnel-event sink (allowlisted names, fire-and-forget). Must
  // work for logged-out visitors — that's the whole funnel.
  if (pathname === '/api/events') {
    return supabaseResponse
  }

  // The /suspended terminal page must be reachable even with a session —
  // otherwise suspended users hit a redirect loop.
  if (pathname === '/suspended') {
    return supabaseResponse
  }

  // ── Supply-only soft-launch gate ────────────────────────────────────────────
  // No-op unless SUPPLY_ONLY_MODE === 'true'. When on, non-exempt visitors
  // (renters / anon) are redirected to /coming-soon; admins, suppliers, and
  // anyone holding the preview-bypass cookie keep the full site.
  if (SUPPLY_ONLY_MODE) {
    // Preview bypass: visiting any URL with ?bypass=<SUPPLY_ONLY_BYPASS_TOKEN>
    // sets a cookie that unlocks the full site for this browser, then strips
    // the token from the URL. Lets the founder/QA browse as any role.
    const bypassToken = process.env.SUPPLY_ONLY_BYPASS_TOKEN
    const provided = request.nextUrl.searchParams.get('bypass')
    if (bypassToken && provided && provided === bypassToken) {
      const cleanUrl = request.nextUrl.clone()
      cleanUrl.searchParams.delete('bypass')
      const res = NextResponse.redirect(cleanUrl)
      res.cookies.set(BYPASS_COOKIE, '1', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 60, // 60 days
      })
      return res
    }

    const hasBypass = request.cookies.get(BYPASS_COOKIE)?.value === '1'
    if (!hasBypass) {
      // Admins and suppliers get the full site; everyone else is gated.
      let exempt = false
      if (user) {
        const { data: profile } = await sessionClient
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single()
        const t = (profile as { user_type?: string } | null)?.user_type
        exempt = t === 'admin' || t === 'supplier'
      }
      if (!exempt && !isSupplyOnlyAllowedPath(pathname)) {
        return withAttribution(
          request,
          NextResponse.redirect(new URL(COMING_SOON_PATH, request.url))
        )
      }
    }
  }

  // Wroomly Match APIs (chat, criteria, alerts, unsubscribe) are public and
  // anonymous — token-gated where needed, no session. Placed AFTER the
  // supply-only gate so the chat stays blocked for renters during soft launch
  // (the gate above already redirected non-exempt visitors), but skips the
  // auth-required block below so it works anonymously once fully launched.
  if (pathname.startsWith('/api/match')) {
    return supabaseResponse
  }

  // Allow public and auth routes
  if (
    AUTH_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/reset-password') ||
    PUBLIC_ROUTES.some(r => pathname === r) ||
    PUBLIC_FILES.includes(pathname) ||
    PUBLIC_PREFIXES.some(p => pathname.startsWith(p)) ||
    (pathname.startsWith('/listings/') && !pathname.endsWith('/edit') && !pathname.endsWith('/new')) ||
    pathname.startsWith('/users/')
  ) {
    return supabaseResponse
  }

  // Require auth for all other routes
  if (!user) {
    const redirectUrl = new URL('/sign-in', request.url)
    // Keep the query string so filters/state survive the sign-in round-trip.
    redirectUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  // Fetch user role from DB
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
  const { data: profile } = await supabase
    .from('users')
    .select('user_type, is_suspended')
    .eq('id', user.id)
    .single()

  if ((profile as { is_suspended?: boolean } | null)?.is_suspended) {
    return NextResponse.redirect(new URL('/suspended', request.url))
  }

  const userType = (profile as { user_type?: string } | null)?.user_type

  // Admin-only routes
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r)) && userType !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Supplier-only routes (admins also allowed)
  if (SUPPLIER_ROUTES.some(r => pathname.startsWith(r)) && userType !== 'supplier' && userType !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // `_vercel` MUST be excluded or the auth gate below redirects
    // /_vercel/insights/script.js to /sign-in and Web Analytics records
    // nothing (Vercel's documented matcher requirement).
    '/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
