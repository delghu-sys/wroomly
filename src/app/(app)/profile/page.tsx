import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile/ProfileForm'
import type { User, UserPhoto } from '@/types/database'

export const metadata: Metadata = { title: 'Profile Settings' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Profile + photos are independent — fan out so we save a round trip.
  const [profileRes, photosRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase
      .from('user_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true }),
  ])

  const profile = profileRes.data
  if (!profile) redirect('/sign-in')
  const photos = photosRes.data

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="animate-fade-up mb-10">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-2">
          Your profile
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink text-balance">
          How others <span className="italic font-light text-navy">see you.</span>
        </h1>
        <p className="text-ink-muted mt-2">
          Keep your details up to date — verified profiles get more responses.
        </p>
      </div>
      <div className="animate-fade-up delay-100">
        <ProfileForm profile={profile as User} initialPhotos={(photos ?? []) as UserPhoto[]} />
      </div>
    </div>
  )
}
