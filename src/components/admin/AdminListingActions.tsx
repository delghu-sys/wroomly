'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface AdminListingActionsProps {
  listingId: string
}

/**
 * Admin approve/reject controls for a pending listing. Mutations go
 * through `/api/admin/actions` which gates on `user_type === 'admin'`
 * server-side and writes via the service role.
 */
export function AdminListingActions({ listingId }: AdminListingActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [showRejectNote, setShowRejectNote] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  async function dispatch(action: 'approve' | 'reject', notes?: string) {
    setLoading(action)
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'listing', listingId, action, notes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Action failed.')
        return
      }
      toast.success(
        action === 'approve' ? 'Listing approved and live!' : 'Listing rejected.'
      )
      router.refresh()
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setLoading(null)
    }
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
            onClick={() => {
              if (!rejectNote.trim()) {
                toast.error('Please provide a reason for rejection.')
                return
              }
              dispatch('reject', rejectNote.trim())
            }}
            disabled={!!loading}
          >
            {loading === 'reject' ? 'Rejecting…' : 'Confirm reject'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRejectNote(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={() => dispatch('approve')}
        disabled={!!loading}
      >
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
