'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle } from 'lucide-react'
import { CheckCircle, LockKey } from '@phosphor-icons/react/dist/ssr'
import { AtmosphericAuthPanel } from '@/components/auth/AtmosphericAuthPanel'
import { BrandFormInput } from '@/components/auth/BrandFormInput'
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string().min(1, 'Please confirm your new password'),
  })
  .refine(d => d.password === d.confirm, {
    path: ['confirm'],
    message: "Passwords don't match",
  })

type FormValues = z.infer<typeof schema>

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

export default function ResetPasswordClient() {
  const router = useRouter()
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  // The recovery flow lands here logged in to a one-time-use session.
  // If a user reaches /reset-password without one, they've either expired
  // or guessed the URL — send them back to forgot-password to start over.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user)
    })
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit({ password }: FormValues) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setServerError(error.message)
      return
    }
    setDone(true)
    // Brief pause so the user reads the success state, then off to the app.
    window.setTimeout(() => router.push('/dashboard'), 1500)
  }

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      <AtmosphericAuthPanel
        headline1="Choose a new"
        headline2="password."
        accentWords={['password.']}
        subhead="Pick something you’ll remember — at least eight characters. You’ll be signed in after submitting."
      />

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="mb-9"
          >
            <p className="text-xs uppercase tracking-[0.22em] text-ink-muted font-semibold mb-3">
              Reset password
            </p>
            <h2 className="font-display text-3xl sm:text-[2.25rem] tracking-tight text-ink leading-[1.05]">
              Pick a new{' '}
              <span className="italic font-light text-[oklch(0.45_0.13_85)]">
                password.
              </span>
            </h2>
          </motion.div>

          {hasSession === false && (
            <div className="rounded-2xl border border-line bg-white px-5 py-4 mb-6">
              <p className="text-sm text-ink-soft leading-relaxed">
                This reset link has expired or has already been used.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-1 mt-2 text-[13px] font-semibold text-[oklch(0.45_0.13_85)] underline-offset-4 hover:underline"
              >
                Send a fresh link →
              </Link>
            </div>
          )}

          {done ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.1 }}
              className="rounded-3xl border border-line bg-white/85 backdrop-blur-xl p-6"
              style={{
                boxShadow:
                  'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 4px 18px oklch(0 0 0 / 0.04)',
              }}
            >
              <div
                className="inline-flex w-11 h-11 rounded-2xl items-center justify-center shadow-[0_6px_20px_oklch(0.55_0.15_142/0.30)]"
                style={{ background: 'oklch(0.55 0.15 142)', color: 'white' }}
              >
                <CheckCircle size={20} weight="duotone" />
              </div>
              <p className="font-display text-xl tracking-tight text-ink mt-4 leading-tight">
                Password updated.
              </p>
              <p className="text-ink-soft mt-2 leading-relaxed">
                Taking you to the app…
              </p>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.1 }}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
            >
              <BrandFormInput
                label="New password"
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={hasSession === false}
                {...register('password')}
                error={errors.password?.message}
              />
              <BrandFormInput
                label="Confirm password"
                type="password"
                placeholder="Type it again"
                autoComplete="new-password"
                disabled={hasSession === false}
                {...register('confirm')}
                error={errors.confirm?.message}
              />

              {serverError && (
                <div className="flex items-start gap-2 text-sm text-[oklch(0.55_0.20_25)] bg-[oklch(0.97_0.04_25)] border border-[oklch(0.85_0.10_25)] rounded-2xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {serverError}
                </div>
              )}

              <div className="pt-2">
                <AuthSubmitButton
                  loading={isSubmitting}
                  disabled={hasSession === false}
                >
                  <LockKey size={16} weight="duotone" className="mr-1" />
                  Save new password
                </AuthSubmitButton>
              </div>

              <p className="text-center text-[13px] text-ink-muted pt-2">
                Remember it after all?{' '}
                <Link
                  href="/sign-in"
                  className="font-medium text-ink-soft hover:text-[oklch(0.45_0.13_85)] transition-colors underline-offset-4 decoration-[oklch(0.84_0.17_85/0.50)] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </motion.form>
          )}
        </div>
      </div>
    </div>
  )
}
