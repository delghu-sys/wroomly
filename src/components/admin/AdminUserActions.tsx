'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { UserType } from '@/types/database'

interface Props {
  userId: string
  currentRole: UserType
  isSuspended: boolean
  isVerified: boolean
}

type Action =
  | 'verify'
  | 'suspend'
  | 'unsuspend'
  | 'promote_admin'
  | 'demote_admin'

const SUCCESS_LABELS: Record<Action, string> = {
  verify: 'User verified.',
  suspend: 'User suspended.',
  unsuspend: 'User reinstated.',
  promote_admin: 'Made admin.',
  demote_admin: 'Removed admin.',
}

/**
 * Admin row controls. All mutations route through `/api/admin/actions`
 * which re-verifies the requester is an admin server-side and writes via
 * the service-role client. The browser never carries the trust.
 */
export function AdminUserActions({
  userId,
  currentRole,
  isSuspended,
  isVerified,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<Action | null>(null)

  async function dispatch(action: Action) {
    setBusy(action)
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'user', userId, action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Action failed.')
      } else {
        toast.success(SUCCESS_LABELS[action])
        router.refresh()
      }
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-1.5 justify-end flex-wrap">
      {!isVerified && !isSuspended && (
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => dispatch('verify')}
        >
          {busy === 'verify' ? '…' : 'Verify'}
        </Button>
      )}
      {isSuspended ? (
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => dispatch('unsuspend')}
        >
          {busy === 'unsuspend' ? '…' : 'Reinstate'}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
          disabled={!!busy}
          onClick={() => dispatch('suspend')}
        >
          {busy === 'suspend' ? '…' : 'Suspend'}
        </Button>
      )}
      {currentRole !== 'admin' ? (
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => dispatch('promote_admin')}
        >
          {busy === 'promote_admin' ? '…' : 'Make admin'}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => dispatch('demote_admin')}
        >
          {busy === 'demote_admin' ? '…' : 'Remove admin'}
        </Button>
      )}
    </div>
  )
}
