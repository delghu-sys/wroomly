import { isClaimTokenExpired } from './claim-token.ts'

/**
 * Drafts that were approved but never published.
 *
 * A claim link lasts 7 days and used to be the ONLY way back to a draft: once
 * it expired, the page told people to import again, and the dashboard never
 * mentioned the draft. In production most self-imported drafts died that way,
 * including ones whose owners had already made an account.
 *
 * Two ways back, both of which only ever reach the draft's real owner:
 *  - signed in with the address the post was imported with (or the account
 *    that already holds the draft) → the dashboard offers "Finish your listing";
 *  - holding an expired link → "Send me a fresh link" mails a new one to the
 *    address the draft was imported with, never to whoever clicked.
 */

export interface DraftRow {
  status: string
  listing_id: string | null
  email: string | null
  claimed_by_user_id: string | null
  claim_token_expires_at?: string | null
}

export function sameEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = a?.trim().toLowerCase()
  const y = b?.trim().toLowerCase()
  return !!x && !!y && x === y
}

/** Approved and not yet published: there is still something to finish. */
export function isUnfinished(row: Pick<DraftRow, 'status' | 'listing_id'>): boolean {
  return row.status === 'completed' && !row.listing_id
}

/** May this signed-in user pick the draft up from their dashboard? */
export function canResumeDraft(row: DraftRow, user: { id: string; email: string | null | undefined }): boolean {
  if (!isUnfinished(row)) return false
  // Once an account holds the draft, only that account may continue it.
  if (row.claimed_by_user_id) return row.claimed_by_user_id === user.id
  return sameEmail(row.email, user.email)
}

/** May an expired link trigger a fresh one (mailed to the original address)? */
export function canRefreshLink(row: DraftRow, now: Date = new Date()): boolean {
  return isUnfinished(row) && !!row.email && isClaimTokenExpired(row.claim_token_expires_at, now)
}

/** Escape LIKE wildcards so an address like "a_b@x.com" only matches itself. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, ch => `\\${ch}`)
}
