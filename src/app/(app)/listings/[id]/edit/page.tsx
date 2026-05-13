import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { EditListingForm } from '@/components/listings/EditListingForm'
import { ArrowLeft } from 'lucide-react'
import type { Listing } from '@/types/database'

export const metadata: Metadata = { title: 'Edit listing' }

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in?next=/listings/${id}/edit`)

  const { data: profile } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()
  const userType = (profile as { user_type?: string } | null)?.user_type

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (!listing) notFound()

  const l = listing as Listing
  const isOwner = l.supplier_id === user.id
  const isAdmin = userType === 'admin'
  if (!isOwner && !isAdmin) {
    redirect('/my-listings')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/my-listings"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to my listings
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit listing</h1>
      <p className="text-gray-500 text-sm mb-8">
        Changes are saved instantly. Use status to pause or archive without losing the listing.
      </p>
      <EditListingForm listing={l} />
    </div>
  )
}
