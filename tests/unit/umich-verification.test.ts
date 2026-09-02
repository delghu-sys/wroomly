import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  emailDomain,
  hasUmichSsoIdentity,
  computeVerification,
} from '../../src/lib/auth/umich-verification.ts'

// A real UMich Google identity, as GoTrue persists it (server-owned).
const umichGoogle = {
  provider: 'google',
  identity_data: {
    email: 'student@umich.edu',
    email_verified: true,
    custom_claims: { hd: 'umich.edu' },
  },
}

test('emailDomain parses after the LAST @', () => {
  assert.equal(emailDomain('a@b@umich.edu'), 'umich.edu')
  assert.equal(emailDomain('STUDENT@UMICH.EDU'), 'umich.edu')
  assert.equal(emailDomain('  x@umich.edu  '), 'umich.edu')
  assert.equal(emailDomain('nope'), '')
  assert.equal(emailDomain(null), '')
})

test('genuine UMich Google SSO verifies', () => {
  assert.equal(hasUmichSsoIdentity({ identities: [umichGoogle] }), true)
  const v = computeVerification({ identities: [umichGoogle] })
  assert.deepEqual(v, { isVerified: true, method: 'umich_sso', university: 'University of Michigan' })
})

test('look-alike and spoof domains FAIL', () => {
  const cases = [
    'student@umich.edu.attacker.com',
    'student@notumich.edu',
    'student@umich.edu.co',
    'student@evil-umich.edu',
    'student@med.umich.edu', // subdomain: no hd=umich.edu on a non-workspace login
  ]
  for (const email of cases) {
    assert.equal(
      hasUmichSsoIdentity({
        identities: [{ provider: 'google', identity_data: { email, email_verified: true, custom_claims: { hd: 'umich.edu' } } }],
      }),
      email === 'student@med.umich.edu' ? false : false,
      `must not verify ${email}`,
    )
  }
})

test('hd claim is required — a umich.edu email without hd does NOT verify', () => {
  assert.equal(
    hasUmichSsoIdentity({
      identities: [{ provider: 'google', identity_data: { email: 'student@umich.edu', email_verified: true, custom_claims: {} } }],
    }),
    false,
  )
})

test('email_verified=false does NOT verify', () => {
  assert.equal(
    hasUmichSsoIdentity({
      identities: [{ provider: 'google', identity_data: { email: 'student@umich.edu', email_verified: false, custom_claims: { hd: 'umich.edu' } } }],
    }),
    false,
  )
})

test('non-Google (email/password) identity never verifies, even @umich.edu', () => {
  assert.equal(
    hasUmichSsoIdentity({
      identities: [{ provider: 'email', identity_data: { email: 'student@umich.edu', email_verified: true } }],
    }),
    false,
  )
})

test('user_metadata forgery is ignored — only identities count', () => {
  // Attacker sets user_metadata.custom_claims.hd via auth.updateUser. The user
  // object carries it, but there is no qualifying *identity*.
  const forged = {
    user_metadata: { custom_claims: { hd: 'umich.edu' }, email_verified: true },
    identities: [{ provider: 'email', identity_data: { email: 'attacker@gmail.com', email_verified: true } }],
  }
  assert.equal(hasUmichSsoIdentity(forged), false)
  assert.equal(computeVerification(forged).isVerified, false)
})

test('no identities / null user does not throw and does not verify', () => {
  assert.equal(hasUmichSsoIdentity(null), false)
  assert.equal(hasUmichSsoIdentity({}), false)
  assert.equal(hasUmichSsoIdentity({ identities: [] }), false)
})

test('a linked UMich Google identity verifies even if primary email differs', () => {
  const linked = {
    identities: [
      { provider: 'email', identity_data: { email: 'joined-first@gmail.com', email_verified: true } },
      umichGoogle,
    ],
  }
  assert.equal(hasUmichSsoIdentity(linked), true)
})
