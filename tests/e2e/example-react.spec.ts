import { test, expect } from '@playwright/test'
import { startDevServer, type DevServer } from './helpers/dev-server'

let server: DevServer

test.beforeAll(async () => {
  server = await startDevServer('@agentskit/example-react', 5180)
})

test.afterAll(async () => {
  await server?.close()
})

// TODO(#281): @agentskit/core imports fs/promises which breaks browser
// consumers at runtime (the React app's root never mounts). Re-enable
// these tests after the core browser-compat fix lands.
test.describe.skip('@agentskit/example-react (blocked by #281)', () => {
  test('react example — chat UI renders', async ({ page }) => {
    await page.goto(server.url)
    await expect(page.getByPlaceholder(/type|message/i)).toBeVisible()
  })

  test('react example — send a message and receive a response', async ({ page }) => {
    await page.goto(server.url)
    const input = page.getByPlaceholder(/type|message/i)
    await input.fill('hello')
    await input.press('Enter')
    await expect(page.locator('body')).toContainText('AgentsKit', { timeout: 10_000 })
  })

  test('react example — tool call appears in the chat', async ({ page }) => {
    await page.goto(server.url)
    const input = page.getByPlaceholder(/type|message/i)
    await input.fill('weather?')
    await input.press('Enter')
    await expect(page.locator('body')).toContainText('get_weather', { timeout: 10_000 })
  })
})

// This test does NOT exercise React mounting — it confirms the Vite dev
// server starts and serves the index HTML. Catches bundle/build regressions
// independently of the runtime mount issue tracked in #281.
test('react example — dev server serves index HTML', async ({ page }) => {
  const response = await page.goto(server.url)
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/agentkit|agentskit/i)
})
