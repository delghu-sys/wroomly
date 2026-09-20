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

// ── buildOutreachEmail: no footer ────────────────────────────────────────
//
// NOTE: this used to assert an unsubscribe link + CAN-SPAM postal address
// were always appended, unremovable by a template edit. That footer was
// removed at Hugo's request (2026-09-20), against the assistant's advice —
// see the note atop outreach-template.ts. These tests now assert the
// opposite: the built email is exactly the rendered body, nothing more.

test('the built email is exactly the rendered body — no footer is appended', () => {
  const email = buildOutreachEmail({ subject: 'x', body: 'short' }, vars)
  assert.equal(email.text, 'short')
})

test('the subject is exactly what was saved — no substitution applied to it', () => {
  const email = buildOutreachEmail({ subject: 'Hi {{title}}', body: 'x' }, vars)
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
  const email = buildOutreachEmail(DEFAULT_TEMPLATE, vars)
  assert.ok(email.text.includes('A Sublet'))
  assert.ok(email.text.includes('https://wroomly.app/claim-listing/abc123'))
  assert.equal(email.subject, DEFAULT_TEMPLATE.subject)
})

test('the default template uses both placeholders (a template missing claimUrl would have no working link)', () => {
  const used = templatePlaceholders(DEFAULT_TEMPLATE.body)
  assert.ok(used.has('title'))
  assert.ok(used.has('claimUrl'))
})

test('the default template has no em dash — reads like a person wrote it, not an AI', () => {
  assert.ok(!DEFAULT_TEMPLATE.subject.includes('—'))
  assert.ok(!DEFAULT_TEMPLATE.body.includes('—'))
})

test('a body with no {{claimUrl}} still builds an email — link just never appears (the UI warns, not blocks)', () => {
  const email = buildOutreachEmail({ subject: 'x', body: 'Hi {{title}}, no link here.' } satisfies OutreachTemplate, vars)
  assert.ok(!email.text.includes(vars.claimUrl))
})
