/**
 * Browser-error noise filters for Sentry.
 *
 * Extracted from the client config so they can be unit-tested. One of these
 * patterns is genuinely dangerous if edited carelessly — see DENY_URLS.
 */

export const IGNORE_ERRORS: (string | RegExp)[] = [
  // An extension recursively reads our JSON-LD and calls .toLowerCase() on
  // objects that have no "@context".
  /\["@context"\]\.toLowerCase/,
  // Common extension / cross-origin script noise.
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  // ── In-app browser (WebView) instrumentation ──────────────────────────────
  // Opening a wroomly.app link inside another app (Instagram, Android WebView,
  // iOS WKWebView) injects that app's analytics bridge into our page. When the
  // bridge fails — native side gone, or the iOS handler absent — the throw
  // lands in OUR Sentry, because the global handler catches every uncaught
  // error in the tab. None of `sendDataToNative`, `messageHandlers` or
  // `postMessage` appears anywhere in this codebase, so there is nothing here
  // we could fix; it is purely someone else's code failing inside our tab.
  /Error invoking postMessage/,
  /window\.webkit\.messageHandlers/,
]

export const DENY_URLS: RegExp[] = [
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
  /^safari-(web-)?extension:\/\//,
  // DANGER, read before editing: injected WebView scripts carry a HOST after
  // `app://` (e.g. app://navigation_performance_logger_android). Sentry
  // normalises OUR OWN bundle to `app:///…` — three slashes, empty host. The
  // `[^/]` is therefore load-bearing: drop it and this pattern denies every
  // frame of our own code, silencing all real errors. Covered by
  // tests/unit/sentry-filters.test.ts.
  /^app:\/\/[^/]/,
]
