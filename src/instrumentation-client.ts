// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://76f6956c17c7bd026e4fab9eaa4763f5@o4511417032310784.ingest.us.sentry.io/4511417035259904",

  // Only report from production. Without this, every `next dev` run — ours or a
  // contributor's — sends errors (including transient dev/Turbopack startup
  // races) to the same Sentry project as real users, polluting alerts with
  // non-issues. NODE_ENV is statically inlined by Next.js in the client bundle,
  // so this works the same as it does server/edge-side.
  enabled: process.env.NODE_ENV === "production",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Drop noise thrown by browser extensions / injected scripts rather than our
  // app. These land in Sentry because the global handler catches every uncaught
  // error in the tab. Genuine Wroomly errors (frames in our bundle) still report.
  ignoreErrors: [
    // Seen from an extension recursively reading our JSON-LD structured data
    // and calling .toLowerCase() on objects that have no "@context".
    /\["@context"\]\.toLowerCase/,
    // Common extension / cross-origin script noise.
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
  ],
  denyUrls: [
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    /^safari-(web-)?extension:\/\//,
  ],
  beforeSend(event) {
    // Last-resort guard: drop events whose only stack frame is anonymous
    // "global code" with no reference to our app bundle — i.e. injected scripts.
    const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? []
    const touchesOurCode = frames.some(f => {
      const file = f.filename ?? ""
      return file.includes("/_next/") || file.startsWith("app:///_next") || file.includes("instrumentation-client")
    })
    const fromExtension = frames.some(f => /(chrome|moz|safari(-web)?)-extension:\/\//.test(f.filename ?? ""))
    if (fromExtension) return null
    // Only drop the @context signature when no frame is in our code.
    const msg = event.exception?.values?.[0]?.value ?? ""
    if (/\["@context"\]\.toLowerCase/.test(msg) && !touchesOurCode) return null
    return event
  },

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
