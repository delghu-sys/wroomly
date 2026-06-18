import { UMICH_EMAIL_DOMAIN } from '@/lib/constants'

// Isomorphic on purpose (no 'server-only'): the publish route + claim page
// (server) AND the sign-up form (browser) all need this check. The browser
// can only read NEXT_PUBLIC_* vars, so the allowlist must live there; the
// server-only ALLOWED_SUPPLIER_EMAILS is kept as a fallback for back-compat.
//
// NOTE: this is UX/eligibility, not a security boundary. The hard gate that
// actually controls who can publish stays server-side in the publish route.
function supplierAllowlist(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_ALLOWED_SUPPLIER_EMAILS ??
    process.env.ALLOWED_SUPPLIER_EMAILS ??
    ''
  return raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Returns true if this email is permitted to be a supplier / publish listings.
 * Requires a @umich.edu address by default; specific non-umich emails can be
 * allowlisted via NEXT_PUBLIC_ALLOWED_SUPPLIER_EMAILS (comma-separated).
 */
export function isAllowedSupplierEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const lower = email.toLowerCase().trim()
  if (lower.endsWith(`@${UMICH_EMAIL_DOMAIN}`)) return true
  return supplierAllowlist().includes(lower)
}
