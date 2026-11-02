'use client'

import { useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/**
 * Mails the email template, filled in for one real university, to YOUR own
 * address — the one you are signed in with. The server reads the recipient
 * from your session; nothing here can aim it at anyone else. Uses the SAVED
 * sender and template, so save first.
 */
export function TestTemplateButton({ disabled, hint }: { disabled?: boolean; hint?: string }) {
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/universities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test-template' }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error ?? 'Could not send the test.')
      toast.success(`Test sent to ${data.sentTo}. Check the From (${data.from}) and that replies would go to ${data.replyTo}.`)
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={busy || disabled} onClick={send} title={hint ?? 'Mails the template to your own address'}>
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail data-icon="inline-start" />} Send me a test
    </Button>
  )
}
