import { test, expect } from '@playwright/test'
import { startDevServer, type DevServer } from './helpers/dev-server'

let server: DevServer

test.beforeAll(async () => {
  server = await startDevServer('@agentskit/example-multi-agent', 5181)
})

test.afterAll(async () => {
  await server?.close()
})

// TODO(#281): @agentskit/core imports fs/promises which breaks browser
// consumers at runtime. Re-enable after the core fix lands.
test.describe.skip('@agentskit/example-multi-agent (blocked by #281)', () => {
  test('multi-agent example — chat UI renders', async ({ page }) => {
    await page.goto(server.url)
    await expect(page.getByPlaceholder(/type|message/i)).toBeVisible()
  })

  test('multi-agent example — submit a prompt and see a response', async ({ page }) => {
    await page.goto(server.url)
    const input = page.getByPlaceholder(/type|message/i)
    await input.fill('plan something')
    await input.press('Enter')
    await expect(page.locator('body')).toContainText(/delegate|plan|research|write|agent/i, {
      timeout: 10_000,
    })
  })
})

test('multi-agent example — dev server serves index HTML', async ({ page }) => {
  const response = await page.goto(server.url)
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/agentkit|agentskit|multi/i)
})
