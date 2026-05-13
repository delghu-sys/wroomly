'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { UMICH_EMAIL_DOMAIN } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Home, Search, AlertCircle, ShieldCheck, MessageSquare, CreditCard, ArrowLeft } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'

type Role = 'supplier' | 'consumer'

const termsAgreement = z.literal(true, {
  message: 'You must agree to the Terms of Service to continue',
})

const supplierSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .email('Invalid email')
    .refine(e => e.endsWith(`@${UMICH_EMAIL_DOMAIN}`), {
      message: 'Suppliers must use a @umich.edu email address',
    }),
  university: z.literal('University of Michigan'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  agreed_to_terms: termsAgreement,
})

const consumerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .email('Invalid email'),
  university: z.string().min(2, 'Enter your university name'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  agreed_to_terms: termsAgreement,
})

type SupplierForm = z.infer<typeof supplierSchema>
type ConsumerForm = z.infer<typeof consumerSchema>

const TRUST_ITEMS = [
  { icon: ShieldCheck, text: '@umich.edu verified accounts' },
  { icon: MessageSquare, text: 'Private in-app messaging' },
  { icon: CreditCard, text: 'Escrowed secure payments' },
]

export default function SignUpPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left panel — branding & value prop */}
        <div className="relative lg:w-[45%] bg-navy text-white overflow-hidden flex flex-col justify-between p-8 sm:p-12 lg:p-16">
          {/* Animated gradient mesh */}
          <div
            className="absolute inset-0 -z-0 animate-gradient opacity-90"
            style={{
              background:
                'radial-gradient(60% 80% at 15% 25%, oklch(0.36 0.08 257) 0%, transparent 60%),' +
                'radial-gradient(50% 70% at 85% 75%, oklch(0.4 0.1 280) 0%, transparent 60%),' +
                'radial-gradient(40% 60% at 65% 20%, oklch(0.45 0.09 92 / 0.35) 0%, transparent 65%),' +
                'linear-gradient(180deg, oklch(0.24 0.07 257), oklch(0.22 0.06 257))',
            }}
          />
          {/* Dot grid texture */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(oklch(1 0 0 / 0.6) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          {/* Floating blobs */}
          <div
            className="absolute -top-20 -left-20 w-56 h-56 rounded-full blur-3xl animate-float opacity-40"
            style={{ background: 'oklch(0.86 0.17 92 / 0.35)' }}
          />
          <div
            className="absolute bottom-10 right-10 w-40 h-40 rounded-full blur-3xl animate-float-slow opacity-30"
            style={{ background: 'oklch(0.7 0.14 280 / 0.5)' }}
          />

          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <LogoMark size={32} />
              <span className="font-display text-lg font-semibold tracking-tighter text-white">
                wroomly
              </span>
            </Link>
          </div>

          <div className="relative z-10 my-auto py-12 lg:py-0">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] tracking-tight leading-[1.05] text-balance">
              Make room for
              <br />
              <span className="text-maize">connection.</span>
            </h1>
            <p className="mt-6 text-white/65 text-lg leading-relaxed max-w-md">
              Join thousands of U of M students who sublet and swap housing through a verified, secure marketplace.
            </p>

            <div className="mt-10 space-y-4">
              {TRUST_ITEMS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/[0.06]">
                    <Icon className="w-4 h-4 text-maize" />
                  </div>
                  <span className="text-sm text-white/80">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 hidden lg:block">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} Wroomly. Not affiliated with the University of Michigan.
            </p>
          </div>
        </div>

        {/* Right panel — role selection */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink">
                Get started
              </h2>
              <p className="text-ink-muted mt-2">
                Are you listing a place or looking for one?
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setRole('supplier')}
                className="group w-full p-6 border border-line rounded-2xl bg-surface hover:border-navy hover:shadow-soft ease-smooth transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-navy-soft text-navy flex items-center justify-center shrink-0 ease-smooth transition-all group-hover:bg-navy group-hover:text-white group-hover:scale-105 group-hover:rotate-[-4deg]">
                    <Home className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg tracking-tight text-ink">I have a place</h3>
                    <p className="text-ink-muted text-sm mt-1 leading-relaxed">
                      U of M student subletting or swapping your apartment or room
                    </p>
                    <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-navy bg-navy-soft rounded-full px-2.5 py-1">
                      <ShieldCheck className="w-3 h-3" />
                      Requires @umich.edu email
                    </span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setRole('consumer')}
                className="group w-full p-6 border border-line rounded-2xl bg-surface hover:border-navy hover:shadow-soft ease-smooth transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-maize-soft text-[oklch(0.5_0.12_92)] flex items-center justify-center shrink-0 ease-smooth transition-all group-hover:bg-navy group-hover:text-white group-hover:scale-105 group-hover:rotate-[-4deg]">
                    <Search className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg tracking-tight text-ink">I need a place</h3>
                    <p className="text-ink-muted text-sm mt-1 leading-relaxed">
                      Student from another university looking for housing near U of M
                    </p>
                    <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-[oklch(0.5_0.12_92)] bg-maize-soft rounded-full px-2.5 py-1">
                      <ShieldCheck className="w-3 h-3" />
                      Any email
                    </span>
                  </div>
                </div>
              </button>
            </div>

            <p className="text-center text-sm text-ink-muted mt-8">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-navy hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isSupplier = role === 'supplier'
  const form = isSupplier ? supplierForm : consumerForm
  const onSubmit = isSupplier
    ? supplierForm.handleSubmit(onSubmitSupplier)
    : consumerForm.handleSubmit(onSubmitConsumer)

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — branding (same as role picker) */}
      <div className="relative lg:w-[45%] bg-navy text-white overflow-hidden flex flex-col justify-between p-8 sm:p-12 lg:p-16">
        <div
          className="absolute inset-0 -z-0 animate-gradient opacity-90"
          style={{
            background:
              'radial-gradient(60% 80% at 15% 25%, oklch(0.36 0.08 257) 0%, transparent 60%),' +
              'radial-gradient(50% 70% at 85% 75%, oklch(0.4 0.1 280) 0%, transparent 60%),' +
              'radial-gradient(40% 60% at 65% 20%, oklch(0.45 0.09 92 / 0.35) 0%, transparent 65%),' +
              'linear-gradient(180deg, oklch(0.24 0.07 257), oklch(0.22 0.06 257))',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(oklch(1 0 0 / 0.6) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="absolute -top-20 -left-20 w-56 h-56 rounded-full blur-3xl animate-float opacity-40"
          style={{ background: 'oklch(0.86 0.17 92 / 0.35)' }}
        />
        <div
          className="absolute bottom-10 right-10 w-40 h-40 rounded-full blur-3xl animate-float-slow opacity-30"
          style={{ background: 'oklch(0.7 0.14 280 / 0.5)' }}
        />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <LogoMark size={32} />
            <span className="font-display text-lg font-semibold tracking-tighter text-white">
              wroomly
            </span>
          </Link>
        </div>

        <div className="relative z-10 my-auto py-12 lg:py-0">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] tracking-tight leading-[1.05] text-balance">
            {isSupplier ? (
              <>
                List your place,
                <br />
                <span className="text-maize">earn while away.</span>
              </>
            ) : (
              <>
                Find your next place,
                <br />
                <span className="text-maize">the smart way.</span>
              </>
            )}
          </h1>
          <p className="mt-6 text-white/65 text-lg leading-relaxed max-w-md">
            {isSupplier
              ? 'Going abroad or interning? Sublet your apartment to a verified student in a few minutes.'
              : 'Browse verified listings from U of M students. Secure payments, private messaging, no surprises.'}
          </p>
        </div>

        <div className="relative z-10 hidden lg:block">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Wroomly. Not affiliated with the University of Michigan.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <button
            onClick={() => setRole(null)}
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6 ease-smooth transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mb-8">
            <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink">
              Create your account
            </h2>
            <p className="text-ink-muted mt-2">
              {isSupplier
                ? 'List your U of M housing for sublet or swap'
                : 'Find housing near the University of Michigan'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                placeholder="Jane Smith"
                className="h-11 rounded-xl"
                {...(isSupplier
                  ? supplierForm.register('full_name')
                  : consumerForm.register('full_name'))}
              />
              {form.formState.errors.full_name && (
                <p className="text-sm text-red-600">{form.formState.errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={isSupplier ? 'jsmith@umich.edu' : 'you@email.com'}
                className="h-11 rounded-xl"
                {...(isSupplier
                  ? supplierForm.register('email')
                  : consumerForm.register('email'))}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>

            {!isSupplier && (
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <Input
                  id="university"
                  placeholder="Ohio State University"
                  className="h-11 rounded-xl"
                  {...consumerForm.register('university')}
                />
                {consumerForm.formState.errors.university && (
                  <p className="text-sm text-red-600">
                    {consumerForm.formState.errors.university.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                className="h-11 rounded-xl"
                {...(isSupplier
                  ? supplierForm.register('password')
                  : consumerForm.register('password'))}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                {isSupplier ? (
                  <Controller
                    name="agreed_to_terms"
                    control={supplierForm.control}
                    render={({ field }) => (
                      <Checkbox
                        id="agreed_to_terms"
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        className="mt-0.5"
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
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        className="mt-0.5"
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
                    className="text-navy hover:underline font-medium"
                  >
                    Terms of Service
                  </Link>
                </label>
              </div>
              {form.formState.errors.agreed_to_terms && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.agreed_to_terms.message}
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-navy hover:bg-navy/90 text-white ease-smooth transition-all hover:-translate-y-px"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>

            <p className="text-center text-sm text-ink-muted">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-navy hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
