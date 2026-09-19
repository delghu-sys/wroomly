import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  renderTemplate,
  buildOutreachEmail,
  templatePlaceholders,
  DEFAULT_TEMPLATE,
  type OutreachTemplate,
} from '../../src/lib/agents/outreach-template.ts'

const vars = { title: 'A Sublet', claimUrl: 'https://wroomly.app/claim-listing/abc123' }

test('substitutes {{title}} and {{claimUrl}}', () => {
  const out = renderTemplate('Hi about "{{title}}" — go to {{claimUrl}} now.', vars)
  assert.equal(out, 'Hi about "A Sublet" — go to https://wroomly.app/claim-listing/abc123 now.')
})

test('tolerates spacing inside the braces', () => {
  assert.equal(renderTemplate('{{ title }}', vars), 'A Sublet')
})

test('leaves an unknown placeholder untouched, so a typo is visible', () => {
  assert.equal(renderTemplate('{{titel}}', vars), '{{titel}}')
})

test('a template using neither placeholder is unaffected by substitution', () => {
  assert.equal(renderTemplate('No placeholders here.', vars), 'No placeholders here.')
})

// ── the parts that must NEVER be editable away ───────────────────────────────

test('the unsubscribe link is ALWAYS present, regardless of the template body', () => {
  const email = buildOutreachEmail({ subject: 'x', body: 'short' }, { ...vars, unsubUrl: 'https://wroomly.app/api/outreach/unsubscribe?x' })
  assert.ok(email.text.includes('https://wroomly.app/api/outreach/unsubscribe?x'))
})

test('the CAN-SPAM postal address is ALWAYS present, regardless of the template body', () => {
  const email = buildOutreachEmail({ subject: 'x', body: 'short' }, { ...vars, unsubUrl: 'u' })
  assert.ok(email.text.includes('Wroomly LLC'))
  assert.ok(email.text.includes('Ann Arbor, MI'))
})

test('an admin cannot remove the footer by writing similar-looking text into the body', () => {
  // The footer is appended in code, not interpolated from the body — so even
  // a body that TRIES to look like a real unsubscribe line changes nothing
  // about whether the real one is present.
  const email = buildOutreachEmail(
    { subject: 'x', body: 'Unsubscribe here: (nothing, this is fake)' },
    { ...vars, unsubUrl: 'https://wroomly.app/api/outreach/unsubscribe?real' },
  )
  assert.ok(email.text.includes('https://wroomly.app/api/outreach/unsubscribe?real'), 'the real link still renders')
  assert.ok(email.text.includes('Wroomly LLC'), 'the real address still renders')
})

test('the subject is exactly what was saved — no substitution applied to it', () => {
  const email = buildOutreachEmail({ subject: 'Hi {{title}}', body: 'x' }, { ...vars, unsubUrl: 'u' })
  assert.equal(email.subject, 'Hi {{title}}', 'subject placeholders are deliberately not rendered')
})

// ── placeholder detection, used to warn an admin before they save ───────────

test('detects which placeholders a template body actually uses', () => {
  assert.deepEqual([...templatePlaceholders('{{title}} and {{claimUrl}}')].sort(), ['claimUrl', 'title'])
  assert.deepEqual([...templatePlaceholders('just {{title}}')], ['title'])
  assert.deepEqual([...templatePlaceholders('nothing here')], [])
})

// ── the shipped default, since it is what every new install actually sends ──

test('the default template renders cleanly with real variables', () => {
  const email = buildOutreachEmail(DEFAULT_TEMPLATE, { ...vars, unsubUrl: 'https://wroomly.app/api/outreach/unsubscribe?x' })
  assert.ok(email.text.includes('A Sublet'))
  assert.ok(email.text.includes('https://wroomly.app/claim-listing/abc123'))
  assert.ok(email.text.includes('https://wroomly.app/api/outreach/unsubscribe?x'))
  assert.ok(email.text.includes('Wroomly LLC'))
  assert.equal(email.subject, DEFAULT_TEMPLATE.subject)
})

test('the default template uses both placeholders (a template missing claimUrl would have no working link)', () => {
  const used = templatePlaceholders(DEFAULT_TEMPLATE.body)
  assert.ok(used.has('title'))
  assert.ok(used.has('claimUrl'))
})

test('a body with no {{claimUrl}} still builds an email — link just never appears (the UI warns, not blocks)', () => {
  const email = buildOutreachEmail({ subject: 'x', body: 'Hi {{title}}, no link here.' } satisfies OutreachTemplate, {
    ...vars,
    unsubUrl: 'u',
  })
  assert.ok(!email.text.includes(vars.claimUrl))
})
