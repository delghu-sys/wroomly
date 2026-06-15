'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Last-resort error boundary that runs *before* the root layout is mounted.
 * Must render its own <html>/<body>. Kept intentionally framework-bare so a
 * broken root layout can't break the recovery screen.
 *
 * Mirrors the error to Sentry as well as the local console so we can
 * forensic it from outside the user's browser session.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
    // eslint-disable-next-line no-console
    console.error('global error boundary:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          background: 'oklch(0.22 0.075 256)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '32rem', width: '100%', textAlign: 'center' }}>
          <p
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: 'oklch(0.84 0.17 85)',
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            Critical error
          </p>
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              lineHeight: 1,
              letterSpacing: '-0.04em',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Wroomly couldn’t load.
          </h1>
          <p
            style={{
              marginTop: 20,
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.6,
              fontSize: 16,
            }}
          >
            A page-level error stopped the app from rendering. Reload the page
            — if it keeps happening, mail us at{' '}
            <a
              href="mailto:help@wroomly.com"
              style={{
                color: 'oklch(0.84 0.17 85)',
                textDecoration: 'underline',
                textUnderlineOffset: 4,
              }}
            >
              help@wroomly.com
            </a>
            .
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 28,
              padding: '0.85rem 1.6rem',
              borderRadius: 9999,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              background: 'oklch(0.84 0.17 85)',
              color: 'oklch(0.22 0.075 256)',
              boxShadow: '0 4px 18px oklch(0.84 0.17 85 / 0.30)',
            }}
          >
            Reload
          </button>

          {error.digest && (
            <p
              style={{
                marginTop: 32,
                fontSize: 11,
                color: 'rgba(255,255,255,0.35)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              error id: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
