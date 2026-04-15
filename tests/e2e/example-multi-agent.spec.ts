import { test, expect } from '@playwright/test'
import { startDevServer, type DevServer } from './helpers/dev-server'

let server: DevServer

test.beforeAll(async () => {
  server = await startDevServer('@agentskit/example-multi-agent', 5181)
})

test.afterAll(async () => {
  await server?.close()
})

test('multi-agent example — dev server serves index HTML', async ({ page }) => {
  const response = await page.goto(server.url)
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/agentkit|agentskit|multi/i)
})

test('multi-agent example — chat UI mounts', async ({ page }) => {
  await page.goto(server.url)
  await expect(page.locator('[data-ak-input]')).toBeVisible()
})

test('multi-agent example — submitting a prompt produces output', async ({ page }) => {
  await page.goto(server.url)

  const input = page.locator('[data-ak-input]')
  await input.fill('plan something for me')
  await input.press('Enter')

  // The user message should appear immediately.
  await expect(page.getByText('plan something for me').first()).toBeVisible({ timeout: 10_000 })
})
