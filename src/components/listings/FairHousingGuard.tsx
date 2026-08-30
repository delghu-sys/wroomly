'use client'

import { AlertTriangle } from 'lucide-react'

/**
 * The warning box the listing form shows when checkFairHousing matches.
 * Warns, never blocks: a blocker gets worked around, a warning teaches — and
 * some flagged words are legitimate in property descriptions, which is why
 * every flag is also logged for tuning (see /api/fair-housing/flag).
 */
export function FairHousingWarning({ phrase }: { phrase: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-2xl border border-[oklch(0.85_0.10_75)] bg-[oklch(0.97_0.04_75)] px-4 py-3"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[oklch(0.50_0.15_75)]" strokeWidth={2} />
      <p className="text-[13px] leading-relaxed text-[oklch(0.35_0.10_75)]">
        <strong>Heads up: this may violate fair housing law.</strong> The
        phrase &ldquo;{phrase}&rdquo; could indicate a preference based on a
        protected characteristic, which is illegal in housing ads under
        federal, Michigan, and Ann Arbor law. Describe the property and the
        terms, not the kind of person you want.{' '}
        <a
          href="/safety#fair-housing"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2"
        >
          Learn more
        </a>
      </p>
    </div>
  )
}

/** The always-visible one-liner near the submit button. */
export function FairHousingNotice() {
  return (
    <p className="text-[12px] text-ink-muted leading-snug">
      Describe the place, not the person. Listings that state a preference
      about who may live there are removed.
    </p>
  )
}

/** Fire-and-forget log call; never blocks the form. */
export function logFairHousing(payload: {
  text: string
  field: 'title' | 'description'
  phase: 'warn' | 'submit'
  shownPhrase?: string
}) {
  fetch('/api/fair-housing/flag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
}
