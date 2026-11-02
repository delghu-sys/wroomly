'use client'

import { Printer } from 'lucide-react'

/** Prints this page, or saves it as a PDF from the browser's print dialog. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 h-11 text-sm font-medium text-ink hover:bg-navy-soft/40 transition-colors print:hidden"
    >
      <Printer className="w-4 h-4" strokeWidth={1.75} /> Print or save as PDF
    </button>
  )
}
