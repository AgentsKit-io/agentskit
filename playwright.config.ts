import { defineConfig } from '@playwright/test'

/**
 * E2E configuration for AgentsKit example apps.
 *
 * Each example has its own dev server started by the individual test file
 * (via a spawned child process) rather than Playwright's webServer option.
 * This keeps each test file self-contained and independently runnable.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,           // examples share ports; run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
  ],
})
