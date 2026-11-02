'use client'

import { Printer } from 'lucide-react'

/** Prints this page, or saves it as a PDF from the browser's print dialog. */
export function PrintButton({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`inline-flex items-center gap-2 rounded-full border px-5 h-12 text-sm font-medium transition-colors print:hidden ${
        tone === 'dark'
          ? 'border-white/20 text-white hover:border-white/40'
          : 'border-line bg-surface text-ink hover:bg-navy-soft/40'
      }`}
    >
      <Printer className="w-4 h-4" strokeWidth={1.75} /> Print or save as PDF
    </button>
  )
}
