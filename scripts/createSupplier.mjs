/**
 * One-off: provision a supplier account for an allowlisted non-umich email,
 * without setting a password ourselves. Creates the auth user (email
 * pre-confirmed) + the public.users supplier row, then prints a secure
 * "set your password" recovery link the user clicks to choose their own
 * password (so no plaintext password is ever transmitted or stored by us).
 *
 *   node --env-file=.env.local scripts/createSupplier.mjs \
 *     --email fa3251541@gmail.com [--name "Full Name"]
 *
 * NOTE: the email must be on NEXT_PUBLIC_ALLOWED_SUPPLIER_EMAILS (or
 * ALLOWED_SUPPLIER_EMAILS) for the account to actually publish listings —
 * that gate is enforced server-side at publish time, independent of this.
 */
import { serviceClient } from './_seedShared.mjs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wroomly.app'

function arg(flag, fallback = null) {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function main() {
  const email = (arg('--email') ?? '').trim().toLowerCase()
  const fullName = arg('--name') // optional; user can complete profile later
  if (!email || !email.includes('@')) {
    console.error('Usage: node --env-file=.env.local scripts/createSupplier.mjs --email <addr> [--name "Name"]')
    process.exit(1)
  }

  const db = serviceClient()

  // 1. Create the auth user (email pre-confirmed, NO password). Idempotent:
  //    if it already exists, locate it instead of failing.
  let authId
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
  })
  if (createErr) {
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
    const found = list?.users?.find(u => u.email?.toLowerCase() === email)
    if (!found) throw new Error(`Could not create or find auth user: ${createErr.message}`)
    authId = found.id
    console.log(`Auth user already existed — reusing ${authId}`)
  } else {
    authId = created.user.id
    console.log(`Created auth user ${authId}`)
  }

  // 2. Upsert the public.users profile as a supplier (no auto-create trigger).
  //    Never overwrite an existing user_type — only set fields on first create.
  const { data: existingRow } = await db.from('users').select('id').eq('id', authId).maybeSingle()
  if (!existingRow) {
    const { error: insErr } = await db.from('users').insert({
      id: authId,
      email,
      full_name: fullName ?? null,
      user_type: 'supplier',
      is_verified: true,
    })
    if (insErr) throw new Error(`Could not create users row: ${insErr.message}`)
    console.log('Created public.users supplier row.')
  } else {
    console.log('public.users row already present — left as-is.')
  }

  // 3. Generate a recovery ("set your password") link. We do NOT email it from
  //    here — print it so you can send it to her directly (she's already
  //    emailing you), avoiding any dependency on auto-email delivery.
  const { data: link, error: linkErr } = await db.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${APP_URL}/callback` },
  })
  if (linkErr) throw new Error(`Could not generate set-password link: ${linkErr.message}`)

  console.log('\n── Account ready ──')
  console.log(`  email   : ${email}`)
  console.log(`  type    : supplier (verified)`)
  console.log('\n  Send her this one-time "set your password" link:')
  console.log(`\n  ${link.properties?.action_link}\n`)
  console.log('  Alternatively, she can use “Forgot password?” on the sign-in')
  console.log('  page with this email to get the same flow. Either way she sets')
  console.log('  her own password, then logs in and can publish her listing.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
