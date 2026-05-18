import { createServerClient } from '@supabase/ssr'
import { createClient as createPlainClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — cookies can't be set, middleware handles refresh
          }
        },
      },
    }
  )
}

/**
 * Service-role client — bypasses RLS. Use *only* in trusted server
 * contexts (API routes after auth checks, webhook handlers, server-side
 * data migrations). Never call from a Server Component that renders
 * untrusted data, and never expose its results to the client.
 *
 * Uses the plain `@supabase/supabase-js` client (not @supabase/ssr) so
 * Postgres sees `role: service_role` from the Authorization header and
 * bypasses Row-Level Security. The ssr client wires up cookie-based
 * user auth which can shadow the service-role intent.
 */
export function createServiceClient() {
  return createPlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        // Service role is stateless — don't try to persist a session.
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
