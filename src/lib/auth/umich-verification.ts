/** The one university Wroomly verifies; the value stamped on SSO accounts. */
export const UMICH = 'University of Michigan'

/**
 * Whether a Supabase auth user has *proven* they control a live University of
 * Michigan account, i.e. earned the blue check.
 *
 * The proof is a Google identity on the umich.edu Workspace. @umich.edu is
 * Google Workspace, so an OIDC login on that domain necessarily cleared UMich
 * Weblogin + Duo — a live, 2FA-backed session. We key on the SERVER-OWNED
 * `identity_data` that GoTrue writes from the validated ID token, never on the
 * email string and never on `user_metadata` (which the user can rewrite with
 * `auth.updateUser({ data })`).
 *
 * Three independent checks, all from identity_data:
 *   1. the `hd` (hosted-domain) claim is exactly "umich.edu" — Google only sets
 *      it for real Workspace members, and it can't be spoofed by owning a
 *      look-alike address;
 *   2. `email_verified` is true — never trust an unverified email claim;
 *   3. the identity email's domain (parsed after the LAST "@") is umich.edu —
 *      belt-and-suspenders against a mismatched hd.
 *
 * A raw "email ends with @umich.edu" test is deliberately NOT used: it passes
 * for `x@umich.edu.attacker.com`, `x@notumich.edu`, and email-provider accounts
 * that never touched SSO.
 */

export interface AuthIdentityLike {
  provider?: string | null
  identity_data?: Record<string, unknown> | null
}

export interface AuthUserLike {
  identities?: AuthIdentityLike[] | null
}

/** Domain after the LAST "@" (so `a@b@umich.edu` → "umich.edu", not "b"). */
export function emailDomain(email: unknown): string {
  if (typeof email !== 'string') return ''
  const at = email.toLowerCase().trim()
  const i = at.lastIndexOf('@')
  return i === -1 ? '' : at.slice(i + 1)
}

/** True iff `user` carries a Google identity proving live UMich SSO. */
export function hasUmichSsoIdentity(user: AuthUserLike | null | undefined): boolean {
  const identities = user?.identities ?? []
  return identities.some(identity => {
    if (identity?.provider !== 'google') return false
    const d = (identity.identity_data ?? {}) as {
      email?: unknown
      email_verified?: unknown
      hd?: unknown
      custom_claims?: { hd?: unknown; email_verified?: unknown } | null
    }
    // GoTrue nests the OIDC `hd` under custom_claims; tolerate a top-level copy.
    const hd = d.custom_claims?.hd ?? d.hd
    const emailVerified =
      d.email_verified === true || d.custom_claims?.email_verified === true
    return hd === 'umich.edu' && emailVerified && emailDomain(d.email) === 'umich.edu'
  })
}

/**
 * The verification a login should confer, computed purely from server-owned
 * data. `'umich_sso'` when a qualifying identity is present, else null.
 *
 * This is authoritative for the SSO channel in BOTH directions: absence
 * revokes an `umich_sso` badge (identity unlinked, or Google revoked the
 * Workspace membership). Legacy `umich_email_legacy` rows are governed
 * separately — this never manufactures that value.
 */
export function computeVerification(
  user: AuthUserLike | null | undefined,
): { isVerified: boolean; method: 'umich_sso' | null; university: string | null } {
  return hasUmichSsoIdentity(user)
    ? { isVerified: true, method: 'umich_sso', university: UMICH }
    : { isVerified: false, method: null, university: null }
}
