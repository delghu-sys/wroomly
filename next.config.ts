import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

// Content-Security-Policy shipped in REPORT-ONLY mode: it never blocks a
// request, it only logs violations to the browser console. This lets us see
// what a strict policy would break (Mapbox tiles, Stripe.js, Supabase realtime,
// Next's inline bootstrap) before promoting it to an enforcing header.
// To enforce later: rename the key to 'Content-Security-Policy' and drop any
// origins that legitimately show up as violations.
const SUPABASE = 'https://sgoeucbxxjqjsopoxeiw.supabase.co'
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE} https://*.tiles.mapbox.com https://api.mapbox.com`,
  `connect-src 'self' ${SUPABASE} wss://sgoeucbxxjqjsopoxeiw.supabase.co https://api.mapbox.com https://events.mapbox.com https://api.stripe.com`,
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "font-src 'self' data:",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  // Force HTTPS for two years incl. subdomains (Vercel already serves HTTPS).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Stop MIME-sniffing (defends against content-type confusion / drive-by XSS).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Clickjacking: the app is never meant to be framed by another origin.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Don't leak full URLs (which can contain ids) to third-party destinations.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Drop access to powerful browser APIs we don't use.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sgoeucbxxjqjsopoxeiw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Signed URLs for private import source files (admin review + claim pages).
        protocol: 'https',
        hostname: 'sgoeucbxxjqjsopoxeiw.supabase.co',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "wroomly",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
