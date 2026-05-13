'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface AdminListingActionsProps {
  listingId: string
}

export function AdminListingActions({ listingId }: AdminListingActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [showRejectNote, setShowRejectNote] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  async function handleApprove() {
    setLoading('approve')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('listings').update({ status: 'active' }).eq('id', listingId)
    await supabase.from('admin_actions').insert({
      admin_id: user!.id,
      target_type: 'listing',
      target_id: listingId,
      action: 'approve_listing',
    })

    toast.success('Listing approved and live!')
    router.refresh()
    setLoading(null)
  }

  async function handleReject() {
    if (!rejectNote.trim()) {
      toast.error('Please provide a reason for rejection.')
      return
    }
    setLoading('reject')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('listings').update({ status: 'archived' }).eq('id', listingId)
    await supabase.from('admin_actions').insert({
      admin_id: user!.id,
      target_type: 'listing',
      target_id: listingId,
      action: 'reject_listing',
      notes: rejectNote,
    })

    toast.success('Listing rejected.')
    router.refresh()
    setLoading(null)
  }

  if (showRejectNote) {
    return (
      <div className="space-y-2">
        <Textarea
          placeholder="Reason for rejection (shared with supplier)…"
          rows={2}
          value={rejectNote}
          onChange={e => setRejectNote(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleReject}
            disabled={!!loading}
          >
            {loading === 'reject' ? 'Rejecting…' : 'Confirm reject'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowRejectNote(false)}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={handleApprove} disabled={!!loading}>
        {loading === 'approve' ? 'Approving…' : 'Approve'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowRejectNote(true)}
        className="text-red-600 border-red-200 hover:bg-red-50"
        disabled={!!loading}
      >
        Reject
      </Button>
    </div>
  )
}
