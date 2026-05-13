'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export function AdminAutoReviewSweep() {
  const router = useRouter()
  const [running, setRunning] = useState(false)

  async function handleSweep() {
    setRunning(true)
    try {
      const res = await fetch('/api/admin/auto-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sweep: true }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Sweep failed.')
      } else {
        toast.success(
          json.reviewed === 0
            ? 'No pending listings to review.'
            : `AI reviewed ${json.reviewed} listing${json.reviewed === 1 ? '' : 's'}.`
        )
        router.refresh()
      }
    } catch {
      toast.error('Sweep failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <Button onClick={handleSweep} disabled={running} variant="outline">
      <Sparkles className="w-4 h-4 mr-1.5" />
      {running ? 'Running AI review…' : 'Run AI review on pending'}
    </Button>
  )
}
