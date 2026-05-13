'use client'

import { useSearchParams } from 'next/navigation'
import { Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function VerifyEmailClient() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [resent, setResent] = useState(false)
  const [sending, setSending] = useState(false)

  async function resendEmail() {
    setSending(true)
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email })
    setResent(true)
    setSending(false)
  }

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          We sent a verification link to{' '}
          <span className="font-medium text-gray-900">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">
          Click the link in the email to verify your account. It may take a minute to arrive.
          Check your spam folder if you don&apos;t see it.
        </p>
        {resent ? (
          <p className="text-sm text-green-600 font-medium">Email resent! Check your inbox.</p>
        ) : (
          <Button variant="outline" className="w-full" onClick={resendEmail} disabled={sending}>
            {sending ? 'Sending…' : 'Resend verification email'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
