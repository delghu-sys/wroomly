/**
 * Re-issue a claim link for an approved AI-import draft (status='completed'),
 * optionally binding it to a specific user account so only they can claim it.
 * Mints a fresh token (old emailed link stops working) and prints the new URL.
 *
 *   node --env-file=.env.local scripts/issueClaimLink.mjs \
 *     --request <import_request_id> [--user <user_id>]
 *
 * Mirrors src/lib/listing-import/claim-token.ts exactly: raw token = 32 random
 * bytes (base64url), only its SHA-256 hex is stored; the claim page hashes the
 * incoming URL token and matches by hash.
 */
import { randomBytes, createHash } from 'node:crypto'
import { serviceClient } from './_seedShared.mjs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'
const TTL_DAYS = 7

function arg(flag) {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null
}

async function main() {
  const requestId = arg('--request')
  const userId = arg('--user') // optional: bind claimed_by_user_id
  if (!requestId) {
    console.error('Usage: node --env-file=.env.local scripts/issueClaimLink.mjs --request <id> [--user <id>]')
    process.exit(1)
  }

  const db = serviceClient()

  const { data: req, error } = await db
    .from('listing_import_requests')
    .select('id, status, listing_id, email, claimed_by_user_id, extracted_data')
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw error
  if (!req) {
    console.error('No import request with that id.')
    process.exit(1)
  }
  if (req.status !== 'completed') {
    console.error(`Request status is "${req.status}" — only approved (completed) drafts can be claimed.`)
    process.exit(1)
  }
  if (req.listing_id) {
    console.error('This draft was already published — nothing to claim.')
    process.exit(1)
  }

  const raw = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(raw).digest('hex')
  const expiry = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000)

  const patch = {
    claim_token_hash: hash,
    claim_token_expires_at: expiry.toISOString(),
  }
  if (userId) patch.claimed_by_user_id = userId

  const { error: upErr } = await db.from('listing_import_requests').update(patch).eq('id', requestId)
  if (upErr) throw upErr

  console.log('\n── Fresh claim link issued ──')
  console.log(`  draft   : ${req.extracted_data?.title ?? '(untitled)'}`)
  console.log(`  for     : ${req.email}`)
  if (userId) console.log(`  bound to: user ${userId} (only this account can claim)`)
  console.log(`  expires : ${expiry.toISOString().slice(0, 10)} (7 days)`)
  console.log('\n  Send her this link (she must be logged in to her account):')
  console.log(`\n  ${APP_URL}/claim-listing/${raw}\n`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
