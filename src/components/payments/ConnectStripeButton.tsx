'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function ConnectStripeButton() {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' })
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error ?? 'Failed to create Stripe onboarding link.')
        setLoading(false)
      }
    } catch {
      toast.error('Network error — please try again.')
      setLoading(false)
    }
  }

  return (
    <Button size="sm" onClick={handleConnect} disabled={loading} className="press shrink-0 rounded-full bg-navy text-white hover:bg-navy/90">
      {loading ? 'Redirecting…' : 'Connect Stripe'}
    </Button>
  )
}
