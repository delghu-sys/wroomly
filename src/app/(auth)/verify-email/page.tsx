import { Suspense } from 'react'
import VerifyEmailClient from './VerifyEmailClient'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-amber-50 p-4">
      <Suspense fallback={<div>Loading…</div>}>
        <VerifyEmailClient />
      </Suspense>
    </div>
  )
}
