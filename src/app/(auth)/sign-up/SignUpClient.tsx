'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { AtmosphericAuthPanel } from '@/components/auth/AtmosphericAuthPanel'
import { BrandFormInput } from '@/components/auth/BrandFormInput'
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { AppleAuthButton } from '@/components/auth/AppleAuthButton'
import { AuthDivider } from '@/components/auth/AuthDivider'
import { RoleSelectorCards, type Role } from '@/components/auth/RoleSelectorCards'
import { RoleContinueCta } from '@/components/auth/RoleContinueCta'

// NOTE: no testimonials on auth panels until real ones exist — see the note
// in SignInClient.tsx. Real match stories (with permission) go back in via
// the panel's `testimonials` prop.

const termsAgreement = z.literal(true, {
  message: 'You must agree to the Terms of Service to continue',
})

const supplierSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  university: z.literal('University of Michigan'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  agreed_to_terms: termsAgreement,
})

const consumerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  university: z.string().min(2, 'Enter your university name'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  agreed_to_terms: termsAgreement,
})

type SupplierForm = z.infer<typeof supplierSchema>
type ConsumerForm = z.infer<typeof consumerSchema>

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

export default function SignUpClient({
  supplyOnly = false,
}: {
  supplyOnly?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Read ?as=supplier (or consumer) from the URL so deep-links from the
  // landing page's "List your place" CTA skip the role-picker step the
  // user has effectively already answered. Invalid values just fall
  // through to the standard picker.
  // During the supply-only soft launch, force the supplier role — renters
  // can't sign up yet, so the consumer path / role picker is removed entirely.
  const initialRole: Role | null = supplyOnly
    ? 'supplier'
    : searchParams.get('as') === 'supplier'
      ? 'supplier'
      : searchParams.get('as') === 'consumer'
        ? 'consumer'
        : null
  const [role, setRole] = useState<Role | null>(initialRole)
  const [pendingRole, setPendingRole] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Whether the person is a UMich student. Drives the auth method: UMich → the
  // Google umich.edu SSO path that earns the blue check; non-UMich → Google /
  // Apple / email, no badge. Suppliers default to UMich since listing requires
  // verification; renters choose. `null` until chosen (renters).
  const [umichStudent, setUmichStudent] = useState<boolean | null>(
    initialRole === 'supplier' ? true : null,
  )

  const supplierForm = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      university: 'University of Michigan',
      agreed_to_terms: false as unknown as true,
    },
  })

  const consumerForm = useForm<ConsumerForm>({
    resolver: zodResolver(consumerSchema),
    defaultValues: {
      agreed_to_terms: false as unknown as true,
    },
  })

  async function onSubmitSupplier(data: SupplierForm) {
    const { agreed_to_terms: _agreed, ...rest } = data
    void _agreed
    await handleSignUp({ ...rest, user_type: 'supplier' })
  }

  async function onSubmitConsumer(data: ConsumerForm) {
    const { agreed_to_terms: _agreed, ...rest } = data
    void _agreed
    await handleSignUp({ ...rest, user_type: 'consumer' })
  }

  async function handleSignUp(data: {
    full_name: string
    email: string
    university: string
    password: string
    user_type: Role
  }) {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
        data: {
          full_name: data.full_name,
          university: data.university,
          user_type: data.user_type,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
  }

  // ── Role-picker view ──
  if (!role) {
    return (
      <div className="min-h-[100dvh] flex flex-col lg:flex-row">
        <AtmosphericAuthPanel
          headline1="Make room for"
          headline2="connection."
          accentWords={['connection.']}
          subhead="Sublet housing near the University of Michigan. Verified UMich students wear a blue check next to their name — so you can always see whose listing is from a real student."
        />

        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className="mb-10"
            >
              <p className="text-xs uppercase tracking-[0.22em] text-ink-muted font-semibold mb-3">
                Step 01 — Pick your side
              </p>
              <h2 className="font-display text-3xl sm:text-[2.5rem] tracking-tight text-ink leading-[1.05]">
                Are you listing a place
                <br />
                <span className="italic font-light text-[oklch(0.45_0.13_85)]">
                  or looking for one?
                </span>
              </h2>
            </motion.div>

            <RoleSelectorCards
              selected={pendingRole}
              onSelect={setPendingRole}
            />

            {/* Continue CTA — only after a role is selected */}
            <div className="mt-6">
              <RoleContinueCta
                selected={pendingRole}
                onContinue={() => setRole(pendingRole)}
              />
            </div>

            {/* Google sign-up — appears once a side is picked, so we know
                which user_type to create. */}
            {pendingRole && (
              <div className="mt-5 space-y-3">
                <AuthDivider label="or" />
                <GoogleAuthButton
                  intendedType={pendingRole}
                  onError={setError}
                  label="Continue with Google"
                />
                {error && (
                  <p className="text-center text-xs text-[oklch(0.55_0.20_25)]">
                    {error}
                  </p>
                )}
              </div>
            )}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...spring, delay: 0.6 }}
              className="text-center text-[13px] text-ink-muted mt-10"
            >
              Already have an account?{' '}
              <Link
                href="/sign-in"
                className="font-medium text-ink-soft hover:text-[oklch(0.45_0.13_85)] transition-colors underline-offset-4 decoration-[oklch(0.84_0.17_85/0.50)] hover:underline"
              >
                Sign in
              </Link>
            </motion.p>
          </div>
        </div>
      </div>
    )
  }

  // ── Form view ──
  const isSupplier = role === 'supplier'
  const form = isSupplier ? supplierForm : consumerForm
  const onSubmit = isSupplier
    ? supplierForm.handleSubmit(onSubmitSupplier)
    : consumerForm.handleSubmit(onSubmitConsumer)

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      <AtmosphericAuthPanel
        headline1={isSupplier ? 'List your place,' : 'Find your next place,'}
        headline2={isSupplier ? 'earn while away.' : 'the smart way.'}
        accentWords={
          isSupplier ? ['earn', 'while', 'away.'] : ['the', 'smart', 'way.']
        }
        subhead={
          isSupplier
            ? 'Going abroad or interning? Sublet your apartment to a verified student in a few minutes.'
            : 'Browse verified listings from U of M students. Real students, private messaging, no surprises.'
        }
      />

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          {!supplyOnly && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={spring}
              onClick={() => {
                setPendingRole(role)
                setRole(null)
              }}
              className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-7 transition-colors active:scale-[0.97]"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
              Back to role selection
            </motion.button>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="mb-9"
          >
            <p className="text-xs uppercase tracking-[0.22em] text-ink-muted font-semibold mb-3">
              Step 02 — Your details
            </p>
            <h2 className="font-display text-3xl sm:text-[2.25rem] tracking-tight text-ink leading-[1.05]">
              Create your{' '}
              <span className="italic font-light text-[oklch(0.45_0.13_85)]">
                account.
              </span>
            </h2>
            <p className="text-ink-soft mt-3 leading-relaxed">
              {isSupplier
                ? 'List your U of M housing for sublet.'
                : 'Find housing near the University of Michigan.'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="space-y-3 mb-5"
          >
            {/* UMich-student question — decides the verification path. */}
            <div className="rounded-2xl border border-line bg-surface/60 p-1 flex gap-1">
              <button
                type="button"
                onClick={() => setUmichStudent(true)}
                aria-pressed={umichStudent === true}
                className={`flex-1 h-10 rounded-xl text-[13px] font-semibold transition-all ${
                  umichStudent === true
                    ? 'bg-[oklch(0.55_0.22_264)] text-white shadow-sm'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                I&rsquo;m a UMich student
              </button>
              <button
                type="button"
                onClick={() => setUmichStudent(false)}
                aria-pressed={umichStudent === false}
                className={`flex-1 h-10 rounded-xl text-[13px] font-semibold transition-all ${
                  umichStudent === false
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                I&rsquo;m not
              </button>
            </div>

            {umichStudent === true && (
              <>
                <GoogleAuthButton
                  intendedType={role}
                  onError={setError}
                  umich
                  label="Continue with your UMich Google"
                />
                <p className="text-center text-[12px] text-ink-muted leading-snug">
                  Sign in with your <strong>@umich.edu</strong> Google account to
                  get the blue <span className="text-[#2F6BFF] font-semibold">✓ UMich verified</span> check
                  {isSupplier
                    ? ' — so renters can see your listing is from a real UMich student.'
                    : ' next to your name.'}
                </p>
              </>
            )}

            {umichStudent === false && (
              <>
                <GoogleAuthButton
                  intendedType={role}
                  onError={setError}
                  label="Sign up with Google"
                />
                <AppleAuthButton intendedType={role} onError={setError} />
                <p className="text-center text-[12px] text-ink-muted leading-snug">
                  By continuing, you agree to our{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ink-soft hover:text-[oklch(0.45_0.13_85)] underline-offset-4 hover:underline"
                  >
                    Terms of Service
                  </Link>
                  .
                </p>
                <AuthDivider label="or sign up with email" />
              </>
            )}
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.15 }}
            onSubmit={onSubmit}
            // Email/password is only offered on the non-UMich path — UMich
            // verification requires the Google SSO round-trip, so we hide the
            // email form until they pick "I'm not" (or leave it hidden for the
            // UMich path, guiding them to the Google button above).
            hidden={umichStudent !== false}
            className="space-y-5"
          >
            <BrandFormInput
              label="Full name"
              placeholder="Marcus Whitfield"
              {...(isSupplier
                ? supplierForm.register('full_name')
                : consumerForm.register('full_name'))}
              error={form.formState.errors.full_name?.message}
            />

            <BrandFormInput
              label="Email"
              type="email"
              placeholder="you@email.com"
              {...(isSupplier
                ? supplierForm.register('email')
                : consumerForm.register('email'))}
              error={form.formState.errors.email?.message}
            />

            {!isSupplier && (
              <BrandFormInput
                label="University"
                placeholder="Ohio State University"
                {...consumerForm.register('university')}
                error={consumerForm.formState.errors.university?.message}
              />
            )}

            <BrandFormInput
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              {...(isSupplier
                ? supplierForm.register('password')
                : consumerForm.register('password'))}
              error={form.formState.errors.password?.message}
            />

            <div className="space-y-2 pt-1">
              <div className="flex items-start gap-3">
                {isSupplier ? (
                  <Controller
                    name="agreed_to_terms"
                    control={supplierForm.control}
                    render={({ field }) => (
                      <Checkbox
                        id="agreed_to_terms"
                        checked={!!field.value}
                        onCheckedChange={checked => field.onChange(checked === true)}
                        className="mt-0.5 data-[state=checked]:bg-[oklch(0.22_0.075_256)] data-[state=checked]:border-[oklch(0.22_0.075_256)]"
                      />
                    )}
                  />
                ) : (
                  <Controller
                    name="agreed_to_terms"
                    control={consumerForm.control}
                    render={({ field }) => (
                      <Checkbox
                        id="agreed_to_terms"
                        checked={!!field.value}
                        onCheckedChange={checked => field.onChange(checked === true)}
                        className="mt-0.5 data-[state=checked]:bg-[oklch(0.22_0.075_256)] data-[state=checked]:border-[oklch(0.22_0.075_256)]"
                      />
                    )}
                  />
                )}
                <label
                  htmlFor="agreed_to_terms"
                  className="text-sm font-normal text-ink-soft leading-snug select-none"
                >
                  I have read and agree to the{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ink hover:text-[oklch(0.45_0.13_85)] transition-colors underline-offset-4 hover:underline"
                  >
                    Terms of Service
                  </Link>
                </label>
              </div>
              {form.formState.errors.agreed_to_terms && (
                <p className="text-xs text-[oklch(0.55_0.20_25)] ml-7">
                  {form.formState.errors.agreed_to_terms.message}
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-[oklch(0.55_0.20_25)] bg-[oklch(0.97_0.04_25)] border border-[oklch(0.85_0.10_25)] rounded-2xl px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="pt-2">
              <AuthSubmitButton loading={loading}>
                Create account
              </AuthSubmitButton>
            </div>

            <p className="text-center text-[13px] text-ink-muted pt-2">
              Already have an account?{' '}
              <Link
                href="/sign-in"
                className="font-medium text-ink-soft hover:text-[oklch(0.45_0.13_85)] transition-colors underline-offset-4 decoration-[oklch(0.84_0.17_85/0.50)] hover:underline"
              >
                Sign in
              </Link>
            </p>
          </motion.form>
        </div>
      </div>
    </div>
  )
}
