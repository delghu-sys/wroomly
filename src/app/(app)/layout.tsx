import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { FooterGate } from '@/components/layout/FooterGate'
import { PageTransition } from '@/components/layout/PageTransition'
import { SUPPLY_ONLY_MODE } from '@/lib/config'
import type { User } from '@/types/database'

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

    // Self-heal: create a profile row from auth metadata if missing (covers
    // users whose email-verify callback never ran). `user_metadata` is
    // CLIENT-MUTABLE — never trust it for trust-sensitive fields:
    //   • `user_type` is forced through the same rule as the callback route:
    //     any value other than `supplier` is coerced to `consumer`.
    //   • `is_verified` is set only because reaching this code path means
    //     Supabase has already verified the email at the auth layer.
    //   • `admin` is never accepted from metadata.
    if (!profile) {
      const meta = (authUser.user_metadata ?? {}) as {
        full_name?: string
        university?: string
        user_type?: 'supplier' | 'consumer'
      }

      const effectiveType = meta.user_type === 'supplier' ? 'supplier' : 'consumer'

      // Service-role: the returning `select('*')` includes email/stripe_* which
      // the authenticated role can no longer read (029). Own row, verified
      // session email — safe.
      const upsertRes = await createServiceClient()
        .from('users')
        .upsert(
          {
            id: authUser.id,
            email: authUser.email!,
            full_name: meta.full_name ?? null,
            university: meta.university ?? null,
            user_type: effectiveType,
            is_verified: true,
          },
          { onConflict: 'id' }
        )
        .select('*')
        .single()
      profile = upsertRes.data as User | null
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
      <Navbar user={profile} unreadCount={unreadCount} supplyOnly={SUPPLY_ONLY_MODE} />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <FooterGate supplyOnly={SUPPLY_ONLY_MODE} userType={profile?.user_type ?? null} />
    </div>
  )
}
