import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  renderEmail,
  partnershipSentence,
  greeting,
  unknownPlaceholders,
  DEFAULT_SETTINGS,
  FRENCH_TEMPLATE,
  languageFor,
  originLine,
  partnershipSentenceFr,
  greetingFr,
} from '../../src/lib/universities/template.ts'
import {
  approvalHash,
  checkSend,
  formatFrom,
  senderProblems,
  settingsFieldMessage,
  type SendCheckInput,
  type Envelope,
} from '../../src/lib/universities/gate.ts'
import { normalizeProspect, mergeProspects, slugify } from '../../src/lib/universities/import.ts'

// All names, offices and addresses below are INVENTED.

const prospect = {
  name: 'Example University',
  country: 'Sweden',
  umich_units: ['Ross', 'UMSI'],
  office_name: 'International Relations Office',
  contact_name: null,
}

// ── the email ───────────────────────────────────────────────────────────────

test('the sentence about the partnership names the Michigan units that exist', () => {
  assert.equal(partnershipSentence(prospect), 'Example University is an exchange partner of the Ross School of Business and the School of Information')
  assert.equal(
    partnershipSentence({ name: 'X', umich_units: ['Engineering (IPE)'] }),
    'X is an exchange partner of the College of Engineering',
  )
  assert.equal(
    partnershipSentence({ name: 'X', umich_units: ['Law', 'LSA (CGIS)', 'Medical School'] }),
    'X is an exchange partner of Michigan Law, the College of LSA and the Michigan Medical School',
  )
  assert.equal(
    partnershipSentence({ name: 'X', umich_units: [] }),
    'X has an exchange partnership with the University of Michigan',
    'no unit known → say only what is certain',
  )
})

test('the greeting never invents a name', () => {
  assert.equal(greeting({ contact_name: 'Ada Lovelace', office_name: 'Exchange Office' }), 'Dear Ada Lovelace,')
  assert.equal(greeting({ contact_name: null, office_name: 'Exchange Office' }), 'Dear Exchange Office,')
  assert.equal(greeting({ contact_name: ' ', office_name: null }), 'Hello,')
})

test('padded or compound names from web pages are tidied or replaced by a plain hello', () => {
  const g = (contact_name: string | null, office_name: string | null) => greeting({ contact_name, office_name })
  assert.equal(g(null, 'International Mobility Office (outgoing exchange for IEU students)'), 'Dear International Mobility Office,')
  assert.equal(g(null, 'Student Exchange Programmes'), 'Dear Student Exchange Programmes team,')
  assert.equal(g(null, 'Global Engagement  Office'), 'Dear Global Engagement Office,')
  assert.equal(g('Takefumi YAMAGUCHI (Outgoing Student Mobility Contact)', null), 'Dear Takefumi YAMAGUCHI,')
  assert.equal(g('Margarida Monteiro and Franciely Torrente', 'Nova Exchange Office'), 'Dear Nova Exchange Office,', 'two people → the office, not a joined name')
  assert.equal(g('Sanna A, Sanna B', null), 'Hello,')
  assert.equal(g(null, 'Student Exchange Office; outgoing'), 'Hello,')
  assert.equal(g(null, 'Study Abroad Office, Global Engagement Center'), 'Hello,')
  assert.equal(g(null, 'x'.repeat(46)), 'Hello,')
})

test('rendering fills every placeholder in the default template', () => {
  const r = renderEmail(prospect, DEFAULT_SETTINGS)
  assert.equal(r.subject, DEFAULT_SETTINGS.subject)
  assert.match(r.body, /^Dear International Relations Office,/)
  assert.match(r.body, /Example University is an exchange partner of the Ross School of Business and the School of Information/)
  assert.doesNotMatch(r.body, /sends students/, 'we only claim what the evidence shows')
  assert.doesNotMatch(r.body, /\{\{/)
  assert.match(r.body, /not affiliated with the University of Michigan/, 'says plainly who we are')
  assert.match(r.body, /just reply and I won't write again/, 'a way to say no')
})

test('a typo in a placeholder is an error, never an email with "{{" in it', () => {
  assert.deepEqual(unknownPlaceholders('Hi {{univercity}} {{greeting}}'), ['univercity'])
  assert.throws(() => renderEmail(prospect, { subject: 'Hi {{univercity}}', body: 'x' }), /Unknown placeholder: \{\{univercity\}\}/)
})

// ── the sender ──────────────────────────────────────────────────────────────

test('the from line is exactly what the recipient will see, with no header injection', () => {
  assert.equal(formatFrom('Hugo from Wroomly', 'hugo@wroomly.app'), 'Hugo from Wroomly <hugo@wroomly.app>')
  assert.equal(formatFrom('Evil"\r\nBcc: x@y.z <', 'hugo@wroomly.app'), 'EvilBcc: x@y.z <hugo@wroomly.app>')
})

test('sender must be on the verified domain and replies must have somewhere to go', () => {
  const ok = { from_name: 'Hugo', from_email: 'hugo@wroomly.app', reply_to: 'me@example.com' }
  assert.deepEqual(senderProblems(ok), [])
  assert.match(senderProblems({ ...ok, from_email: 'hugo@gmail.com' })[0], /@wroomly\.app/)
  assert.match(senderProblems({ ...ok, reply_to: '' })[0], /Reply-to is not set/)
  assert.deepEqual(senderProblems(DEFAULT_SETTINGS), [], 'the defaults are a valid sender')
  assert.match(senderProblems({ ...DEFAULT_SETTINGS, reply_to: '' })[0], /Reply-to is not set/, 'but a blank reply-to is still refused')
})

// ── the gate ────────────────────────────────────────────────────────────────

const env: Envelope = {
  from: 'Hugo from Wroomly <hugo@wroomly.app>',
  to: 'exchange@example.edu',
  replyTo: 'me@example.com',
  subject: 'Hello',
  body: 'Body',
}

const base = (over: Partial<SendCheckInput> = {}): SendCheckInput => ({
  status: 'approved',
  contactEmail: 'exchange@example.edu',
  confidence: 'verified',
  approvalHash: approvalHash(env),
  envelope: env,
  suppressed: new Set(),
  alreadyEmailed: new Set(),
  sentInLastDay: 0,
  dailyCap: 10,
  enabled: true,
  sender: { from_name: 'Hugo', from_email: 'hugo@wroomly.app', reply_to: 'me@example.com' },
  ...over,
})

test('an approved, unedited message to a clean address may go', () => {
  assert.deepEqual(checkSend(base()), { ok: true })
})

test('the real-send switch is checked before anything else about the message', () => {
  assert.deepEqual(checkSend(base({ enabled: false })), { ok: false, reason: 'sending-disabled' })
})

test('a message must have been approved', () => {
  assert.deepEqual(checkSend(base({ status: 'drafted', approvalHash: null })), { ok: false, reason: 'not-approved' })
})

test('changing ANYTHING after approving voids the approval', () => {
  const cases: Partial<Envelope>[] = [
    { body: 'Body, edited' },
    { subject: 'Hello!' },
    { to: 'someone-else@example.edu' },
    { replyTo: 'other@example.com' },
    { from: 'Hugo <ceo@wroomly.app>' },
  ]
  for (const change of cases) {
    const r = checkSend(base({ envelope: { ...env, ...change } }))
    assert.deepEqual(r, { ok: false, reason: 'edited-since-approval' }, JSON.stringify(change))
  }
})

test('never twice, never to an opted-out or already-emailed address, never over the cap', () => {
  assert.deepEqual(checkSend(base({ status: 'sent' })), { ok: false, reason: 'already-sent' })
  assert.deepEqual(checkSend(base({ suppressed: new Set(['exchange@example.edu']) })), { ok: false, reason: 'suppressed' })
  assert.deepEqual(checkSend(base({ alreadyEmailed: new Set(['exchange@example.edu']) })), { ok: false, reason: 'address-already-emailed' })
  assert.deepEqual(checkSend(base({ sentInLastDay: 10 })), { ok: false, reason: 'daily-cap-reached' })
})

test('matching of suppressed addresses ignores case', () => {
  const upper = { ...env, to: 'Exchange@Example.EDU' }
  assert.deepEqual(checkSend(base({ contactEmail: 'Exchange@Example.EDU', envelope: upper, approvalHash: approvalHash(upper), suppressed: new Set(['exchange@example.edu']) })), { ok: false, reason: 'suppressed' })
})

test('no address, or "not found" confidence, means nothing to send to', () => {
  assert.deepEqual(checkSend(base({ contactEmail: null })), { ok: false, reason: 'no-contact-email' })
  assert.deepEqual(checkSend(base({ confidence: 'not_found' })), { ok: false, reason: 'no-contact-email' })
})

test('a bad sender setup refuses the send', () => {
  assert.deepEqual(checkSend(base({ sender: { from_name: 'H', from_email: 'h@gmail.com', reply_to: 'me@example.com' } })), { ok: false, reason: 'sender-misconfigured' })
})

// ── importing research ──────────────────────────────────────────────────────

const raw = (office: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  name: 'Example University',
  country: 'Sweden',
  website: 'https://example.edu',
  umichUnits: ['Ross'],
  evidenceUrl: 'https://example.edu/michigan',
  confidence: 'verified',
  office: { name: 'Exchange Office', pageUrl: 'https://example.edu/exchange', ...office },
  ...extra,
})

test('an address seen on a page is kept, lowercased, with its source', () => {
  const r = normalizeProspect(raw({ email: 'Exchange@Example.edu', emailSourceUrl: 'https://example.edu/exchange', emailKind: 'office' }))
  assert.ok('ok' in r)
  assert.equal(r.ok.contact_email, 'exchange@example.edu')
  assert.equal(r.ok.contact_email_source_url, 'https://example.edu/exchange')
  assert.equal(r.ok.confidence, 'verified')
  assert.equal(r.ok.slug, 'example-university')
})

test('an address with no source page is a guess and is dropped', () => {
  const r = normalizeProspect(raw({ email: 'exchange@example.edu' }))
  assert.ok('ok' in r)
  assert.equal(r.ok.contact_email, null)
  assert.equal(r.ok.confidence, 'not_found', 'confidence cannot outlive the address')
  assert.match(r.dropped[0], /no source page/)
})

test('private mailboxes and malformed addresses are dropped', () => {
  for (const email of ['someone@gmail.com', 'x@outlook.com', 'not-an-email']) {
    const r = normalizeProspect(raw({ email, emailSourceUrl: 'https://example.edu/x' }))
    assert.ok('ok' in r)
    assert.equal(r.ok.contact_email, null, email)
  }
})

test('a contact form alone is kept as a form, not an address', () => {
  const r = normalizeProspect(raw({ contactFormUrl: 'https://example.edu/contact' }, { confidence: 'not_found' }))
  assert.ok('ok' in r)
  assert.equal(r.ok.contact_email, null)
  assert.equal(r.ok.contact_form_url, 'https://example.edu/contact')
})

test('entries for the same university merge: best contact wins, units are combined', () => {
  const a = normalizeProspect(raw({}, { confidence: 'not_found', umichUnits: ['Ross'] }))
  const b = normalizeProspect(raw({ email: 'exchange@example.edu', emailSourceUrl: 'https://example.edu/x' }, { umichUnits: ['UMSI'] }))
  assert.ok('ok' in a && 'ok' in b)
  const [m] = mergeProspects([a.ok, b.ok])
  assert.equal(m.contact_email, 'exchange@example.edu')
  assert.deepEqual(m.umich_units.sort(), ['Ross', 'UMSI'])
})

test('slugs fold accents and symbols', () => {
  assert.equal(slugify('Universität Zürich'), 'universitat-zurich')
  assert.equal(slugify('Hong Kong University of Science & Technology'), 'hong-kong-university-of-science-and-technology')
})

// ── the table ───────────────────────────────────────────────────────────────

import { filterProspects, sortProspects, isSelectable, effectiveSelection, EMPTY_PROSPECT_FILTERS, type ProspectRowLite } from '../../src/lib/universities/table.ts'

const row = (o: Partial<ProspectRowLite> & { id: string; name: string }): ProspectRowLite => ({
  country: 'Sweden', umich_units: [], office_name: null, contact_email: null, contact_form_url: null,
  confidence: 'not_found', status: 'researched', sent_at: null, ...o,
})
const rows = [
  row({ id: 'a', name: 'Alpha Univ', country: 'Sweden', umich_units: ['Ross'], contact_email: 'x@alpha.edu', confidence: 'verified', status: 'approved' }),
  row({ id: 'b', name: 'Beta Univ', country: 'France', umich_units: ['UMSI'], contact_form_url: 'https://beta.edu/c', status: 'researched' }),
  row({ id: 'c', name: 'Gamma Univ', country: 'France', umich_units: ['Ross', 'UMSI'], contact_email: 'y@gamma.edu', confidence: 'likely', status: 'sent', sent_at: '2026-11-03T10:00:00Z' }),
  row({ id: 'd', name: 'Delta Univ', country: null }),
]

test('table filters narrow and combine', () => {
  const ids = (f: object) => filterProspects(rows, { ...EMPTY_PROSPECT_FILTERS, ...f }).map(r => r.id)
  assert.deepEqual(ids({}), ['a', 'b', 'c', 'd'])
  assert.deepEqual(ids({ country: 'France' }), ['b', 'c'])
  assert.deepEqual(ids({ contact: 'email' }), ['a', 'c'])
  assert.deepEqual(ids({ contact: 'form' }), ['b'])
  assert.deepEqual(ids({ contact: 'none' }), ['d'])
  assert.deepEqual(ids({ unit: 'UMSI' }), ['b', 'c'])
  assert.deepEqual(ids({ status: 'sent', country: 'France' }), ['c'])
  assert.deepEqual(ids({ search: 'GAMMA' }), ['c'])
  assert.deepEqual(ids({ search: 'x@alpha' }), ['a'])
})

test('table sorting: approved first by status, blanks last, input untouched', () => {
  assert.deepEqual(sortProspects(rows, 'status', 'asc').map(r => r.id), ['a', 'b', 'd', 'c'])
  assert.deepEqual(sortProspects(rows, 'country', 'asc').map(r => r.id), ['b', 'c', 'a', 'd'], 'no country sinks')
  assert.deepEqual(sortProspects(rows, 'country', 'desc').map(r => r.id), ['a', 'b', 'c', 'd'])
  assert.deepEqual(sortProspects(rows, 'sent_at', 'desc').map(r => r.id), ['c', 'a', 'b', 'd'])
  assert.deepEqual(rows.map(r => r.id), ['a', 'b', 'c', 'd'])
})

test('a rejected settings form names the field, so nobody hunts through six inputs', () => {
  assert.match(settingsFieldMessage('reply_to'), /^Reply-to must be one plain email address/)
  assert.match(settingsFieldMessage('from_email'), /@wroomly\.app/)
  assert.match(settingsFieldMessage('daily_cap'), /1 to 200/)
  assert.match(settingsFieldMessage('body'), /message/i)
  assert.match(settingsFieldMessage('something_else'), /Check the fields/)
})

test('the default settings are the ones chosen: sender, reply-to and a cap of 100', () => {
  assert.equal(DEFAULT_SETTINGS.from_email, 'hugodelgado@wroomly.app')
  assert.equal(DEFAULT_SETTINGS.reply_to, 'delghu@umich.edu')
  assert.equal(DEFAULT_SETTINGS.daily_cap, 100)
  assert.equal(formatFrom(DEFAULT_SETTINGS.from_name, DEFAULT_SETTINGS.from_email), 'Hugo from Wroomly <hugodelgado@wroomly.app>')
})

test('only drafted or approved universities with an address can be ticked', () => {
  const r = (status: ProspectRowLite['status'], contact_email: string | null) => row({ id: status, name: status, status, contact_email })
  assert.equal(isSelectable(r('drafted', 'a@a.edu')), true)
  assert.equal(isSelectable(r('approved', 'a@a.edu')), true)
  assert.equal(isSelectable(r('drafted', null)), false)
  for (const status of ['researched', 'sent', 'replied', 'declined', 'skipped'] as const)
    assert.equal(isSelectable(r(status, 'a@a.edu')), false, status)
})

test('a bulk action only acts on what is ticked AND still on screen', () => {
  const visible = [
    row({ id: 'a', name: 'A', status: 'drafted', contact_email: 'a@a.edu' }),
    row({ id: 'b', name: 'B', status: 'approved', contact_email: 'b@b.edu' }),
    row({ id: 'c', name: 'C', status: 'sent', contact_email: 'c@c.edu' }),
  ]
  // 'hidden' was ticked, then a filter hid it; 'c' can no longer be selected
  const ticked = new Set(['a', 'c', 'hidden'])
  assert.deepEqual(effectiveSelection(visible, ticked), ['a'])
  assert.deepEqual(effectiveSelection(visible, new Set()), [])
})

// ── French, and the "from France" line ──────────────────────────────────────

const fr = { ...prospect, name: 'ESSEC Business School', country: 'France', umich_units: ['Ross'], office_name: 'ESSEC Global BBA Study Abroad Office', contact_name: null }

test('only France is written to in French', () => {
  assert.equal(languageFor('France'), 'fr')
  assert.equal(languageFor(' france '), 'fr')
  for (const c of ['Spain', 'Switzerland', 'Belgium', null, '']) assert.equal(languageFor(c as string | null), 'en', String(c))
})

test('a French university gets the French email, with a formal greeting and French wording', () => {
  const e = renderEmail(fr, DEFAULT_SETTINGS)
  assert.equal(e.subject, FRENCH_TEMPLATE.subject)
  assert.match(e.body, /^Madame, Monsieur,/)
  assert.match(e.body, /ESSEC Business School est partenaire d'échange de la Ross School of Business, et trouver un logement/)
  assert.match(e.body, /Je m'appelle Hugo, je suis originaire de France/)
  assert.match(e.body, /Cordialement,\nHugo/)
  assert.doesNotMatch(e.body, /\{\{|Dear|exchange partner/)
})

test('the French first person stays gender-neutral', () => {
  assert.doesNotMatch(FRENCH_TEMPLATE.body, /français\b|française|\bné\b|\bnée\b/i)
})

test('French wording for the units, and a named contact is greeted by name', () => {
  assert.equal(partnershipSentenceFr({ name: 'X', umich_units: ['Ross', 'UMSI'] }), "X est partenaire d'échange de la Ross School of Business et de la School of Information")
  assert.equal(partnershipSentenceFr({ name: 'X', umich_units: ['LSA (CGIS)'] }), "X est partenaire d'échange du College of LSA")
  assert.equal(partnershipSentenceFr({ name: 'X', umich_units: [] }), "X a un partenariat d'échange avec l'Université du Michigan")
  assert.equal(greetingFr({ contact_name: 'Ludivine Tollitte', office_name: 'Bureau' }), 'Bonjour Ludivine Tollitte,')
  assert.equal(greetingFr({ contact_name: 'A and B', office_name: 'Bureau' }), 'Madame, Monsieur,', 'two people → the formal form, not a joined name')
  assert.equal(greetingFr({ contact_name: null, office_name: null }), 'Madame, Monsieur,')
})

test('other European universities get one honest line, and nobody else does', () => {
  assert.equal(originLine('Germany'), "I'm from France myself, so I know how stressful it is to find a place abroad for a semester.")
  assert.ok(originLine('United Kingdom'))
  assert.ok(originLine('Czech Republic'))
  for (const c of ['Japan', 'Hong Kong', 'Israel', 'Peru', 'Canada', null]) assert.equal(originLine(c as string | null), '', String(c))
  assert.equal(originLine('France'), '', 'France gets it inside the French email instead')
})

test('the line lands in the first paragraph for Europe and leaves no gap anywhere else', () => {
  const de = renderEmail({ ...prospect, country: 'Germany' }, DEFAULT_SETTINGS)
  assert.match(de.body, /students in Ann Arbor\. I'm from France myself, so I know how stressful it is to find a place abroad for a semester\. I'm writing because/)
  const jp = renderEmail({ ...prospect, country: 'Japan' }, DEFAULT_SETTINGS)
  assert.match(jp.body, /students in Ann Arbor\. I'm writing because/, 'no double space where the line would have been')
  assert.doesNotMatch(jp.body, / {2}|\bFrance\b/)
  assert.doesNotMatch(de.body, /\{\{/)
})

test('a saved English template without the new placeholder still renders, just without the line', () => {
  const old = { subject: 'Hi {{university}}', body: '{{greeting}}\n\n{{partnership}}.' }
  const e = renderEmail({ ...prospect, country: 'Germany' }, old)
  assert.equal(e.body, 'Dear International Relations Office,\n\nExample University is an exchange partner of the Ross School of Business and the School of Information.')
})
