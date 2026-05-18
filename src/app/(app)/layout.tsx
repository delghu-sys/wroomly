import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { FooterGate } from '@/components/layout/FooterGate'
import { UMICH_EMAIL_DOMAIN } from '@/lib/constants'
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
    const profileRes = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    profile = profileRes.data as User | null

    // Self-heal: create a profile row from auth metadata if missing (covers
    // users whose email-verify callback never ran). `user_metadata` is
    // CLIENT-MUTABLE — never trust it for trust-sensitive fields:
    //   • `user_type` is forced through the same @umich.edu check as the
    //     callback route. A supplier claim is rejected unless the verified
    //     email is on the U-M domain.
    //   • `is_verified` is set only because reaching this code path means
    //     Supabase has already verified the email at the auth layer.
    //   • `admin` is never accepted from metadata.
    if (!profile) {
      const meta = (authUser.user_metadata ?? {}) as {
        full_name?: string
        university?: string
        user_type?: 'supplier' | 'consumer'
      }

      const claimedType = meta.user_type === 'supplier' ? 'supplier' : 'consumer'
      const emailIsUmich =
        authUser.email?.toLowerCase().endsWith(`@${UMICH_EMAIL_DOMAIN}`) ?? false
      const effectiveType =
        claimedType === 'supplier' && !emailIsUmich ? 'consumer' : claimedType

      const upsertRes = await supabase
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
      <Navbar user={profile} unreadCount={unreadCount} />
      <main className="flex-1">{children}</main>
      <FooterGate />
    </div>
  )
}
