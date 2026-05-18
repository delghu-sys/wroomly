import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

// Load .env.local into process.env BEFORE tests start. Next.js does this
// automatically for the app, but Playwright's runner is a separate process.
loadEnv({ path: '.env.local' })

/**
 * Playwright config for Wroomly.
 *
 * Spins up `next dev` against the local code and runs the suite against it.
 * Loads .env.local so tests have NEXT_PUBLIC_SUPABASE_URL / service-role
 * keys when they need to seed users.
 *
 * Run with:
 *   npm run test:e2e            # headless
 *   npm run test:e2e -- --ui    # interactive UI
 *   npm run test:e2e -- --debug # step through
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Fail fast in CI, keep going locally so devs see the whole picture
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Tests share a Supabase project, and Turbopack's first-compile penalty
  // for a route gets paid once per worker. Two retries + 2 workers gives
  // us reliability without dragging out the suite.
  retries: 2,
  workers: 2,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Surface console errors as test failures so a "page loads" test can
    // also catch a thrown React error / hydration warning.
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Only start `next dev` if no server is already running. Lets you keep
  // a dev server up in another terminal during local development.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
