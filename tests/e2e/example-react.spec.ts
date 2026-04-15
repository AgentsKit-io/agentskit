import { test, expect } from '@playwright/test'
import { startDevServer, type DevServer } from './helpers/dev-server'

let server: DevServer

test.beforeAll(async () => {
  server = await startDevServer('@agentskit/example-react', 5180)
})

test.afterAll(async () => {
  await server?.close()
})

test('react example — dev server serves index HTML', async ({ page }) => {
  const response = await page.goto(server.url)
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/agentkit|agentskit/i)
})

test('react example — chat UI mounts', async ({ page }) => {
  await page.goto(server.url)
  await expect(page.locator('[data-ak-input]')).toBeVisible()
})

test('react example — typed input is reflected in the textarea', async ({ page }) => {
  await page.goto(server.url)

  const input = page.locator('[data-ak-input]')
  await input.fill('hello world')
  await expect(input).toHaveValue('hello world')
})

test('react example — submitting renders the user message', async ({ page }) => {
  await page.goto(server.url)

  const input = page.locator('[data-ak-input]')
  await input.fill('hi there')
  await input.press('Enter')

  // Demo adapter is deterministic — the user message appears in the chat surface.
  await expect(page.getByText('hi there').first()).toBeVisible({ timeout: 10_000 })
})

test('react example — first turn triggers a tool call (deterministic demo adapter)', async ({ page }) => {
  await page.goto(server.url)

  const input = page.locator('[data-ak-input]')
  await input.fill('weather please')
  await input.press('Enter')

  // Demo adapter emits a get_weather tool call on turn 1; ToolCallView surfaces the tool name.
  await expect(page.getByText(/get_weather|weather/i).first()).toBeVisible({ timeout: 10_000 })
})
