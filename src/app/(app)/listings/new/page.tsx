import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingWizard } from '@/components/listings/ListingWizard'

export const metadata: Metadata = { title: 'List Your Place' }

export default async function NewListingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?next=/listings/new')

  const { data: profile } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'supplier' && profile?.user_type !== 'admin') redirect('/dashboard')

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">List your place</h1>
        <p className="text-gray-500 mt-1">It only takes a few minutes</p>
      </div>
      <ListingWizard userId={user.id} />
    </div>
  )
}
