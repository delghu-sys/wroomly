import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { FooterGate } from '@/components/layout/FooterGate'
import { PageTransition } from '@/components/layout/PageTransition'
import { SUPPLY_ONLY_MODE } from '@/lib/config'
import type { User } from '@/types/database'
import { LegalReacceptance } from '@/components/legal/LegalReacceptance'
import { computeVerification } from '@/lib/auth/umich-verification'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let profile: User | null = null
  let unreadCount = 0

  if (authUser) {
    // Own profile via the service role: `select('*')` now includes columns the
    // authenticated role can no longer read (email/phone/stripe_*) after
    // migration 029, so an authenticated `*` read would be denied. This is the
    // user's own row on their own request, so service-role is safe here.
    const profileRes = await createServiceClient()
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    profile = profileRes.data as User | null

    // Self-heal: create a profile row if one is genuinely missing (covers users
    // whose /callback insert never ran). We act ONLY on a real "no rows"
    // result — a transient read ERROR must not be read as "no row", or the
    // upsert below would overwrite a real user's row (resetting verification
    // and coercing user_type, which would demote an admin).
    const rowGenuinelyMissing =
      !profile && (!profileRes.error || profileRes.error.code === 'PGRST116')

    if (rowGenuinelyMissing) {
      const meta = (authUser.user_metadata ?? {}) as {
        full_name?: string
        university?: string
        user_type?: 'supplier' | 'consumer'
      }

      // `user_metadata` is CLIENT-MUTABLE — never trust it for trust fields.
      // `user_type` is coerced (anything but 'supplier' → 'consumer'); `admin`
      // is never accepted. Verification is NOT taken from metadata or assumed
      // from "the email is confirmed": it is computed from the same server-owned
      // Google identity data the callback uses, so a self-healed row earns the
      // badge on exactly the same proof and never merely by existing.
      const effectiveType = meta.user_type === 'supplier' ? 'supplier' : 'consumer'

      const service = createServiceClient()
      const { data: authoritative } = await service.auth.admin.getUserById(authUser.id)
      const verification = computeVerification(authoritative?.user ?? authUser)

      // insert, not upsert: rowGenuinelyMissing already established there is no
      // row, and an insert can't clobber an existing one if we raced.
      const insertRes = await service
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email!,
          full_name: meta.full_name ?? null,
          university: meta.university ?? verification.university,
          user_type: effectiveType,
          is_verified: verification.isVerified,
          verification_method: verification.method,
        })
        .select('*')
        .single()
      profile = insertRes.data as User | null
      // A raced insert (23505) means the row now exists — read it back.
      if (!profile) {
        const reread = await service.from('users').select('*').eq('id', authUser.id).single()
        profile = reread.data as User | null
      }
    }

    // Conversation IDs the user participates in (for the unread badge).
    const convoRes = await supabase
      .from('conversations')
      .select('id')
      .or(`supplier_id.eq.${authUser.id},consumer_id.eq.${authUser.id}`)

    const convoIds = ((convoRes.data ?? []) as { id: string }[]).map(c => c.id)

    if (convoIds.length > 0) {
      const unreadRes = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', authUser.id)
        .in('conversation_id', convoIds)

      unreadCount = unreadRes.count ?? 0
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* Skip link — first focusable element, so keyboard users can jump past
          the nav to the content instead of tabbing through it on every page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none focus:ring-4 focus:ring-maize-bright/50"
      >
        Skip to main content
      </a>
      <Navbar user={profile} unreadCount={unreadCount} supplyOnly={SUPPLY_ONLY_MODE} />
      {/* Clickwrap gate: prompts signed-in users whose latest acceptance
          predates the current policy versions (or who never clickwrapped). */}
      {profile ? <LegalReacceptance /> : null}
      <main id="main-content" className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <FooterGate supplyOnly={SUPPLY_ONLY_MODE} userType={profile?.user_type ?? null} />
    </div>
  )
}
