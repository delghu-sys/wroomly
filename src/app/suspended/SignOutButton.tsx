'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SignOut } from '@phosphor-icons/react/dist/ssr'
import { Loader2 } from 'lucide-react'

export function SignOutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="
        inline-flex items-center gap-2 h-12 px-5 rounded-full
        bg-white/[0.05] backdrop-blur-md text-white/85
        border border-white/[0.15]
        text-sm font-medium tracking-tight
        hover:bg-white/[0.10] hover:border-[oklch(0.84_0.17_85/0.45)]
        transition-colors duration-300 active:scale-[0.97]
        focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.30)]
        disabled:opacity-60 disabled:cursor-not-allowed
      "
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <SignOut size={16} weight="duotone" />}
      Sign out
    </button>
  )
}
