import { randomBytes } from 'node:crypto'

/**
 * Manage tokens for Wroomly Match alerts. ~256 bits of entropy, URL-safe. This
 * single token both authenticates the manage page and powers one-click
 * unsubscribe — there's no login, so the token IS the credential. It's stored in
 * plaintext (unlike claim tokens) because it must round-trip from every email
 * link indefinitely, not just once.
 */
export function generateManageToken(): string {
  return randomBytes(32).toString('base64url')
}
