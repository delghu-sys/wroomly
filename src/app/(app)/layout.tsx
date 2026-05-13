import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import type { User } from '@/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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

    // Self-heal: create profile from auth metadata if missing
    // (covers users whose email-verify callback never ran)
    if (!profile) {
      const meta = (authUser.user_metadata ?? {}) as {
        full_name?: string
        university?: string
        user_type?: 'supplier' | 'consumer'
      }
      const upsertRes = await supabase
        .from('users')
        .upsert(
          {
            id: authUser.id,
            email: authUser.email!,
            full_name: meta.full_name ?? null,
            university: meta.university ?? null,
            user_type: meta.user_type ?? 'consumer',
            is_verified: true,
          },
          { onConflict: 'id' }
        )
        .select('*')
        .single()
      profile = upsertRes.data as User | null
    }

    // Get conversation IDs the user is part of
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
    <div className="flex flex-col min-h-screen">
      <Navbar user={profile} unreadCount={unreadCount} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
