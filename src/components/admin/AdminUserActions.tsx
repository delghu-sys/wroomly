'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { UserType } from '@/types/database'

interface Props {
  userId: string
  currentRole: UserType
  isSuspended: boolean
  isVerified: boolean
}

export function AdminUserActions({ userId, currentRole, isSuspended, isVerified }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function update(patch: Record<string, unknown>, label: string, action: string) {
    setBusy(action)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('users').update(patch).eq('id', userId)
    if (error) {
      toast.error(`Failed to ${label}.`)
    } else {
      await supabase.from('admin_actions').insert({
        admin_id: user!.id,
        target_type: 'user',
        target_id: userId,
        action,
      })
      toast.success(label)
      router.refresh()
    }
    setBusy(null)
  }

  return (
    <div className="flex items-center gap-1.5 justify-end flex-wrap">
      {!isVerified && !isSuspended && (
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => update({ is_verified: true }, 'User verified.', 'verify_user')}
        >
          {busy === 'verify_user' ? '…' : 'Verify'}
        </Button>
      )}
      {isSuspended ? (
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => update({ is_suspended: false }, 'User reinstated.', 'unsuspend_user')}
        >
          {busy === 'unsuspend_user' ? '…' : 'Reinstate'}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
          disabled={!!busy}
          onClick={() => update({ is_suspended: true }, 'User suspended.', 'suspend_user')}
        >
          {busy === 'suspend_user' ? '…' : 'Suspend'}
        </Button>
      )}
      {currentRole !== 'admin' ? (
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => update({ user_type: 'admin' }, 'Made admin.', 'promote_admin')}
        >
          {busy === 'promote_admin' ? '…' : 'Make admin'}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => update({ user_type: 'consumer' }, 'Demoted to consumer.', 'demote_admin')}
        >
          {busy === 'demote_admin' ? '…' : 'Remove admin'}
        </Button>
      )}
    </div>
  )
}
