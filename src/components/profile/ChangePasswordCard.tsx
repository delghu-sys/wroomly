'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirm: z.string().min(1, 'Confirm your new password'),
  })
  .refine(d => d.newPassword === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })
  .refine(d => d.newPassword !== d.currentPassword, {
    message: 'New password must be different from your current one',
    path: ['newPassword'],
  })

type FormValues = z.infer<typeof schema>

/**
 * In-app password change for the signed-in user. We re-authenticate with the
 * current password first (signInWithPassword), so an open/borrowed session
 * can't silently change the password — then updateUser sets the new one.
 */
export function ChangePasswordCard({ email }: { email: string }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    const supabase = createClient()

    // 1. Verify the current password by re-authenticating.
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: data.currentPassword,
    })
    if (authErr) {
      toast.error('Current password is incorrect.')
      return
    }

    // 2. Set the new password for the logged-in user.
    const { error } = await supabase.auth.updateUser({ password: data.newPassword })
    if (error) {
      toast.error(error.message || 'Could not update password. Please try again.')
      return
    }

    toast.success('Password updated.')
    reset()
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-ink-muted" />
        <h2 className="font-display text-lg tracking-tight text-ink">Change password</h2>
      </div>
      <p className="text-xs text-ink-muted -mt-2">
        Update the password you use to sign in.
      </p>

      <div className="space-y-2">
        <Label>Current password</Label>
        <Input type="password" autoComplete="current-password" {...register('currentPassword')} />
        {errors.currentPassword && (
          <p className="text-sm text-red-600">{errors.currentPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>New password</Label>
        <Input type="password" autoComplete="new-password" {...register('newPassword')} />
        {errors.newPassword && (
          <p className="text-sm text-red-600">{errors.newPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Confirm new password</Label>
        <Input type="password" autoComplete="new-password" {...register('confirm')} />
        {errors.confirm && <p className="text-sm text-red-600">{errors.confirm.message}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  )
}
