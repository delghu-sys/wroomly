// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://76f6956c17c7bd026e4fab9eaa4763f5@o4511417032310784.ingest.us.sentry.io/4511417035259904",

  // Only report from production. Without this, every `next dev` run — ours or a
  // contributor's — sends errors (including transient dev/Turbopack startup
  // races, like middleware firing before env vars finish loading) to the same
  // Sentry project as real users, polluting alerts with non-issues.
  enabled: process.env.NODE_ENV === "production",

  // Client-disconnect noise: "Error: aborted" fires when a browser drops the
  // connection mid-response (navigation away, flaky mobile network). Nothing
  // is wrong server-side; without this filter it lands as level:fatal and
  // buries real errors (prelaunch-audit item 6).
  ignoreErrors: [/^Error: aborted$/, "aborted", "ECONNRESET"],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
