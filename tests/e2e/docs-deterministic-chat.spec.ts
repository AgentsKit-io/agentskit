import { expect, test } from '@playwright/test'
import { startPackageServer, type DevServer } from './helpers/dev-server'

let server: DevServer

test.beforeAll(async () => {
  server = await startPackageServer('@agentskit/docs-next', 3180)
})

test.afterAll(async () => {
  await server?.close()
})

test('docs chat answers locally, then escalates an unknown query with context intact', async ({ page }) => {
  const backendBodies: unknown[] = []
  await page.route('https://ask.agentskit.io/v1/ask', async route => {
    backendBodies.push(route.request().postDataJSON())
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'Backend grounded answer.' })
  })
  await page.goto(`${server.url}/docs`)

  const input = page.locator('[data-ak-composer] textarea')
  await input.fill('How do I install AgentsKit?')
  await input.press('Enter')
  await expect(page.getByText(/pnpm add @agentskit\/core @agentskit\/adapters/)).toBeVisible()
  await expect(page.locator('[data-ak-citation]')).toBeVisible()
  await expect(page.locator('[data-ak-answer-path="local"]')).toHaveText(/instant · local/)
  expect(backendBodies).toHaveLength(0)

  await page.getByRole('button', { name: 'clear' }).click()
  const unknown = 'Compare AgentsKit with an unknown framework for my regulated workload'
  await input.fill(unknown)
  await input.press('Enter')
  await expect(page.getByText('Backend grounded answer.')).toBeVisible()
  await expect(page.locator('[data-ak-answer-path="backend"]')).toHaveText(/grounded · backend/)
  expect(backendBodies).toHaveLength(1)
  expect(backendBodies[0]).toMatchObject({ messages: expect.arrayContaining([{ role: 'user', content: unknown }]) })
})
