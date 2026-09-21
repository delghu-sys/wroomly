import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * "Does this user own this draft, and if nobody does yet, take it."
 *
 * Claiming is a WRITE, so it must happen only when someone actually acts on a
 * draft — uploading a photo, publishing — never because they looked at it.
 * The review page used to claim from a useEffect on mount, which meant simply
 * opening a link bound that draft to whoever opened it: a cold-outreach
 * recipient signed into the wrong account could take a draft they never meant
 * to touch, and then be locked out of it with the right account. Conflicts are
 * surfaced by the claim page server-side, so nothing needed that write.
 *
 * Holding the raw claim token from the email IS the credential; this only
 * records which account exercised it first.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, 'public', any>

export type ClaimGuardResult =
  | { ok: true; claimedNow: boolean }
  | { ok: false; status: 403 | 500; error: string }

export async function ensureClaimedBy(
  db: Db,
  req: { id: string; claimed_by_user_id: string | null },
  userId: string,
): Promise<ClaimGuardResult> {
  if (req.claimed_by_user_id === userId) return { ok: true, claimedNow: false }

  if (req.claimed_by_user_id != null) {
    return { ok: false, status: 403, error: 'You don’t have access to this draft.' }
  }

  // `.is(..., null)` makes this a compare-and-set: two tabs racing to claim the
  // same unclaimed draft cannot both win, and the loser is re-read below.
  const { data, error } = await db
    .from('listing_import_requests')
    .update({ claimed_by_user_id: userId, claimed_at: new Date().toISOString() })
    .eq('id', req.id)
    .is('claimed_by_user_id', null)
    .select('id')

  if (error) {
    console.error('[claim-guard] claim failed', error)
    return { ok: false, status: 500, error: 'Could not claim the draft.' }
  }

  // No row updated → somebody claimed it between our read and our write.
  if (!data || data.length === 0) {
    const { data: fresh } = await db
      .from('listing_import_requests')
      .select('claimed_by_user_id')
      .eq('id', req.id)
      .maybeSingle()
    const owner = (fresh as { claimed_by_user_id?: string | null } | null)?.claimed_by_user_id
    if (owner === userId) return { ok: true, claimedNow: true }
    return { ok: false, status: 403, error: 'You don’t have access to this draft.' }
  }

  return { ok: true, claimedNow: true }
}
