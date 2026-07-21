'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle } from 'lucide-react'
import { AtmosphericAuthPanel } from '@/components/auth/AtmosphericAuthPanel'
import { BrandFormInput } from '@/components/auth/BrandFormInput'
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { AppleAuthButton } from '@/components/auth/AppleAuthButton'
import { AuthDivider } from '@/components/auth/AuthDivider'

// NOTE: no testimonials on auth panels until real ones exist. Placeholder
// quotes with invented names undercut the verification trust story — the
// panel's trust badges carry the structural claims instead. When real match
// stories land (with permission), pass them via the panel's `testimonials`
// prop (RotatingTestimonial is kept for exactly that).

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawNext = searchParams.get('next') ?? '/'
  // Same-origin relative paths only — block protocol-relative ("//evil.com")
  // and backslash-bypass ("/\evil.com") open-redirect forms.
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : '/'
  // Show a reason passed back from /callback (e.g. a failed Google round-trip).
  const [error, setError] = useState<string | null>(searchParams.get('error'))

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    setError(null)
    // UMich accounts have no password — they sign in with Google (2-step
    // verification). Steer @umich.edu emails to Google instead of the generic
    // "didn't match" error they'd otherwise hit.
    if (data.email.trim().toLowerCase().endsWith('@umich.edu')) {
      setError(
        'University of Michigan accounts sign in with Google, not a password. Use “Continue with Google” above.',
      )
      return
    }
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (signInError) {
      // Don't leak whether the email exists — Supabase distinguishes
      // "Invalid login credentials" from "Email not confirmed" etc.
      // We only surface a generic message to thwart enumeration.
      // The original error still lands in the console for our own debugging.
      console.warn('[sign-in] auth error:', signInError.message)
      setError("That email and password didn't match. Try again.")
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      <AtmosphericAuthPanel
        headline1="Welcome back,"
        headline2="wolverine."
        accentWords={['wolverine.']}
        subhead="Make room for connection — sign in to manage your listings, check messages, and stay on top of your housing."
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
              Welcome
            </p>
            <h2 className="font-display text-3xl sm:text-[2.25rem] tracking-tight text-ink leading-[1.05]">
              Sign{' '}
              <span className="italic font-light text-[oklch(0.45_0.13_85)]">
                back in.
              </span>
            </h2>
            <p className="text-ink-soft mt-3 leading-relaxed">
              Enter your credentials to access your account.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="space-y-5"
          >
            <GoogleAuthButton next={next} onError={setError} />
            <AppleAuthButton next={next} onError={setError} />
            <AuthDivider label="or sign in with email" />
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.15 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5 mt-5"
          >
            <BrandFormInput
              label="Email"
              type="email"
              placeholder="you@university.edu"
              {...register('email')}
              error={errors.email?.message}
            />

            <BrandFormInput
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
              trailing={
                <Link
                  href="/forgot-password"
                  className="text-xs text-ink-muted hover:text-[oklch(0.45_0.13_85)] font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              }
            />

            {error && (
              <div className="flex items-start gap-2 text-sm text-[oklch(0.55_0.20_25)] bg-[oklch(0.97_0.04_25)] border border-[oklch(0.85_0.10_25)] rounded-2xl px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="pt-2">
              <AuthSubmitButton loading={isSubmitting}>Sign in</AuthSubmitButton>
            </div>

            <p className="text-center text-[13px] text-ink-muted pt-2">
              Don&apos;t have an account?{' '}
              <Link
                href="/sign-up"
                className="font-medium text-ink-soft hover:text-[oklch(0.45_0.13_85)] transition-colors underline-offset-4 decoration-[oklch(0.84_0.17_85/0.50)] hover:underline"
              >
                Sign up
              </Link>
            </p>
          </motion.form>
        </div>
      </div>
    </div>
  )
}

export default function SignInClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center text-ink-muted">
          Loading…
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  )
}
