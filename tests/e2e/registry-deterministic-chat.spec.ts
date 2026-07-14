import { expect, test } from '@playwright/test'
import { startPackageServer, type DevServer } from './helpers/dev-server'

let server: DevServer

test.beforeAll(async () => {
  server = await startPackageServer('@agentskit/registry-app', 3190)
})

test.afterAll(async () => {
  await server?.close()
})

test('Registry answers exact facts locally and escalates semantic recommendations with context', async ({ page }) => {
  const backendBodies: unknown[] = []
  await page.route('https://ask.agentskit.io/v1/ask?corpus=registry', async (route) => {
    backendBodies.push(route.request().postDataJSON())
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: [
        JSON.stringify({ type: 'text', delta: 'Use the Research Agent.\n\n```bash\nnpx agentskit add research\n```' }),
        JSON.stringify({ type: 'tool', id: 'sources', name: 'cite', args: { sources: [{ title: 'Research Agent', path: '/agents/research' }] } }),
        JSON.stringify({ type: 'done' }),
        '',
      ].join('\n'),
    })
  })
  await page.goto(server.url)
  await page.getByRole('button', { name: 'Ask Registry' }).click()
  const input = page.getByLabel('Ask a Registry question')

  await input.fill('npx agentskit add research')
  await input.press('Enter')
  await expect(page.locator('.rg-ask-message.assistant')).toContainText('npx agentskit add research')
  await expect(page.getByRole('heading', { name: 'Research Agent', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Sources' })).toBeVisible()
  await expect(page.locator('[data-rg-answer-path="local"]')).toHaveText(/instant · local/)
  expect(backendBodies).toHaveLength(0)

  await page.getByRole('button', { name: 'clear' }).click()
  const semantic = 'Which agent fits a citation-heavy market investigation?'
  await input.fill(semantic)
  await input.press('Enter')
  await expect(page.getByText('Use the Research Agent.')).toBeVisible()
  await expect(page.locator('.rg-ask-message.assistant pre code')).toHaveText('npx agentskit add research')
  await expect(page.locator('[data-rg-answer-path="backend"]')).toHaveText(/grounded · backend/)
  expect(backendBodies).toHaveLength(1)
  expect(backendBodies[0]).toMatchObject({
    messages: expect.arrayContaining([{ role: 'user', content: semantic }]),
    deterministic: { outcome: 'escalation', reason: 'miss' },
  })
})

test('Registry retries local knowledge and never labels a failed backend response as grounded', async ({ page }) => {
  let siteConfigRequests = 0
  await page.route('**/deterministic/site-config.json', async (route) => {
    siteConfigRequests += 1
    if (siteConfigRequests === 1) await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
    else await route.continue()
  })
  await page.route('https://ask.agentskit.io/v1/ask?corpus=registry', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: `${JSON.stringify({ type: 'error', message: 'backend unavailable' })}\n`,
    })
  })

  await page.goto(server.url)
  const trigger = page.getByRole('button', { name: 'Ask Registry' })
  await trigger.click()
  const input = page.getByLabel('Ask a Registry question')
  await input.fill('Which agent should investigate this market?')
  await input.press('Enter')
  await expect(page.locator('[data-rg-answer-path="backend"]')).toHaveCount(0)

  await page.getByRole('button', { name: 'Close' }).click()
  await page.waitForTimeout(1_050)
  await trigger.click()
  await expect.poll(() => siteConfigRequests).toBeGreaterThanOrEqual(2)
  await input.fill('npx agentskit add research')
  await input.press('Enter')
  await expect(page.locator('[data-rg-answer-path="local"]')).toHaveText(/instant · local/)

  await page.getByRole('button', { name: 'clear' }).click()
  await input.fill('Which agent should investigate this market?')
  await input.press('Enter')
  await expect(page.locator('[data-rg-answer-path="pending"]')).toHaveText(/consulting backend/)
  await expect(page.locator('[data-rg-answer-path="backend"]')).toHaveCount(0)
})

test('Registry chat remains keyboard-accessible and viewport-safe on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto(server.url)
  await page.keyboard.press('Tab')
  const trigger = page.getByRole('button', { name: 'Ask Registry' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Ask Registry' })
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0)
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375)
  await expect(page.getByLabel('Ask a Registry question')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})
