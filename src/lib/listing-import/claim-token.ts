import { randomBytes, createHash } from 'node:crypto'

// Claim tokens: a high-entropy raw token is emailed once; only its SHA-256
// hash is stored. Lookups hash the incoming token and match by hash, so the
// raw token never touches the DB and a DB leak can't be replayed.

export const CLAIM_TOKEN_TTL_DAYS = 7

/** 32 random bytes → URL-safe string. ~256 bits of entropy. */
export function generateClaimToken(): string {
  return randomBytes(32).toString('base64url')
}

/** SHA-256 hex of the raw token. Deterministic — used for storage + lookup. */
export function hashClaimToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

/** Expiry timestamp for a freshly minted token. */
export function claimTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + CLAIM_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
}

/** True when `expiresAt` is in the past. */
export function isClaimTokenExpired(
  expiresAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return true
  const exp = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return exp.getTime() <= now.getTime()
}
