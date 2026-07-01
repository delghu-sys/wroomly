// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://76f6956c17c7bd026e4fab9eaa4763f5@o4511417032310784.ingest.us.sentry.io/4511417035259904",

  // Only report from production. Without this, every `next dev` run — ours or a
  // contributor's — sends errors (including transient dev/Turbopack startup
  // races, like middleware firing before env vars finish loading) to the same
  // Sentry project as real users, polluting alerts with non-issues.
  enabled: process.env.NODE_ENV === "production",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
