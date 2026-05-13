'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, ShieldCheck, MessageSquare, CreditCard } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

const TRUST_ITEMS = [
  { icon: ShieldCheck, text: '@umich.edu verified accounts' },
  { icon: MessageSquare, text: 'Private in-app messaging' },
  { icon: CreditCard, text: 'Escrowed secure payments' },
]

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    setError(null)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (signInError) {
      setError(signInError.message)
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — branding */}
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
            Welcome back,
            <br />
            <span className="text-maize">wolverine.</span>
          </h1>
          <p className="mt-6 text-white/65 text-lg leading-relaxed max-w-md">
            Make room for connection — sign in to manage your listings, check messages, and stay on top of your housing.
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

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink">
              Sign in
            </h2>
            <p className="text-ink-muted mt-2">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                className="h-11 rounded-xl"
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-navy hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                className="h-11 rounded-xl"
                {...register('password')}
              />
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>

            <p className="text-center text-sm text-ink-muted">
              Don&apos;t have an account?{' '}
              <Link href="/sign-up" className="text-navy hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <SignInForm />
    </Suspense>
  )
}
