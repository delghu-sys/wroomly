import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_ROUTES = ['/', '/listings', '/about', '/terms', '/privacy', '/guides']
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
const PUBLIC_FILES = ['/sitemap.xml', '/robots.txt', '/manifest.webmanifest']
// /import-listing + /claim-listing/ are public entry points for the AI
// Listing Importer (a visitor may not have an account yet). The claim page
// validates the token server-side; the claim/publish APIs do their own auth.
const PUBLIC_PREFIXES = [
  '/ann-arbor/',
  '/buildings/',
  '/guides/',
  '/import-listing',
  '/claim-listing/',
]

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Stripe webhook validates its own signature; don't burn an auth lookup
  // or the cookie roundtrip on every event delivery.
  if (pathname === '/api/stripe/webhook') {
    return supabaseResponse
  }

  // AI Listing Importer API. /api/listing-imports (create) is intentionally
  // public — a visitor without an account submits here. The claim/publish
  // sub-routes enforce their own auth, so let them through the middleware
  // instead of redirecting unauthenticated POSTs to /sign-in.
  if (pathname.startsWith('/api/listing-imports')) {
    return supabaseResponse
  }

  // The /suspended terminal page must be reachable even with a session —
  // otherwise suspended users hit a redirect loop.
  if (pathname === '/suspended') {
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
    redirectUrl.searchParams.set('next', pathname)
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
