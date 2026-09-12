import { test } from 'node:test'
import assert from 'node:assert/strict'
import { IGNORE_ERRORS, DENY_URLS } from '../../src/lib/observability/sentry-filters.ts'

const denied = (url: string) => DENY_URLS.some(r => r.test(url))
const ignored = (msg: string) =>
  IGNORE_ERRORS.some(p => (typeof p === 'string' ? msg.includes(p) : p.test(msg)))

// ── The load-bearing distinction ─────────────────────────────────────────────
// Real frame URLs taken verbatim from the six unresolved Sentry issues.
test('denies injected WebView scripts (host after app://)', () => {
  assert.equal(denied('app://navigation_performance_logger_android:1'), true)
})

test('NEVER denies our own bundle (app:/// — empty host)', () => {
  // If this ever fails, every real error is being silently dropped.
  for (const ours of [
    'app:///listings/6f4bdcd4-88de-497b-a7d9-5b0ec33dd527:1',
    'app:///buildings/arbor-blu:2',
    'app:///_next/static/chunks/main-app.js',
    'app:///_next/server/app/page.js',
  ]) {
    assert.equal(denied(ours), false, `must not deny our own frame: ${ours}`)
  }
})

test('still denies browser extensions', () => {
  assert.equal(denied('chrome-extension://abcdef/inject.js'), true)
  assert.equal(denied('moz-extension://abcdef/inject.js'), true)
  assert.equal(denied('safari-web-extension://abcdef/inject.js'), true)
})

test('does not deny ordinary https frames', () => {
  assert.equal(denied('https://wroomly.app/_next/static/chunks/app.js'), false)
})

// ── Message-based filters, from the real issue titles ────────────────────────
test('ignores WebView bridge failures', () => {
  assert.equal(
    ignored('Error: Error invoking postMessage: Java exception was raised during method invocation'),
    true,
  )
  assert.equal(ignored('Error: Error invoking postMessage: Java object is gone'), true)
  assert.equal(
    ignored("TypeError: undefined is not an object (evaluating 'window.webkit.messageHandlers')"),
    true,
  )
})

test('still ignores the known extension + ResizeObserver noise', () => {
  assert.equal(ignored('TypeError: e["@context"].toLowerCase is not a function'), true)
  assert.equal(ignored('ResizeObserver loop limit exceeded'), true)
})

test('does NOT ignore genuine application errors', () => {
  for (const real of [
    "TypeError: Cannot read properties of undefined (reading 'listing')",
    'Error: Failed to fetch listings',
    'TypeError: null is not an object (evaluating \'b.parentNode\')', // React $RS — deliberately NOT filtered
    'Error: supabase insert failed',
  ]) {
    assert.equal(ignored(real), false, `must still report: ${real}`)
  }
})
