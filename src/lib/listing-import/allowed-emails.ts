import 'server-only'
import { UMICH_EMAIL_DOMAIN } from '@/lib/constants'

/**
 * Returns true if this email is permitted to publish listings.
 * Requires a @umich.edu address by default; specific non-umich emails
 * can be allowlisted via the ALLOWED_SUPPLIER_EMAILS env var (comma-separated).
 */
export function isAllowedSupplierEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  if (lower.endsWith(`@${UMICH_EMAIL_DOMAIN}`)) return true
  const allowlist = (process.env.ALLOWED_SUPPLIER_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return allowlist.includes(lower)
}
