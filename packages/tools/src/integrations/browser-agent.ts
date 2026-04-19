import { defineTool } from '@agentskit/core'

/**
 * Browser-agent tool bundle. Playwright is too heavy to bundle
 * (native browsers, ~200 MB of optional deps), so we accept a
 * pre-provisioned page via a minimal `BrowserPage` contract and
 * expose the five actions an agent actually needs: navigate, click,
 * fill, read, screenshot.
 *
 * A thin Playwright adapter:
 *
 *   import { chromium } from 'playwright'
 *   const browser = await chromium.launch()
 *   const page = await browser.newPage()
 *   const page: BrowserPage = {
 *     goto: async url => { await page.goto(url) },
 *     click: async selector => { await page.click(selector) },
 *     fill: async (selector, value) => { await page.fill(selector, value) },
 *     textContent: async selector => (await page.textContent(selector)) ?? '',
 *     screenshot: async () => (await page.screenshot({ type: 'png' })).toString('base64'),
 *     waitForSelector: async selector => { await page.waitForSelector(selector) },
 *   }
 */

export interface BrowserPage {
  goto: (url: string) => Promise<void>
  click: (selector: string) => Promise<void>
  fill: (selector: string, value: string) => Promise<void>
  textContent: (selector: string) => Promise<string>
  screenshot: () => Promise<string>
  waitForSelector: (selector: string, options?: { timeoutMs?: number }) => Promise<void>
}

export interface BrowserAgentConfig {
  page: BrowserPage
}

export function browserGoto(config: BrowserAgentConfig) {
  return defineTool({
    name: 'browser_goto',
    description: 'Navigate the managed browser page to a URL.',
    schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    } as const,
    async execute({ url }) {
      await config.page.goto(String(url))
      return { ok: true }
    },
  })
}

export function browserClick(config: BrowserAgentConfig) {
  return defineTool({
    name: 'browser_click',
    description: 'Click a CSS selector on the current page.',
    schema: {
      type: 'object',
      properties: { selector: { type: 'string' } },
      required: ['selector'],
    } as const,
    async execute({ selector }) {
      await config.page.click(String(selector))
      return { ok: true }
    },
  })
}

export function browserFill(config: BrowserAgentConfig) {
  return defineTool({
    name: 'browser_fill',
    description: 'Fill a form input at a CSS selector with a value.',
    schema: {
      type: 'object',
      properties: { selector: { type: 'string' }, value: { type: 'string' } },
      required: ['selector', 'value'],
    } as const,
    async execute({ selector, value }) {
      await config.page.fill(String(selector), String(value))
      return { ok: true }
    },
  })
}

export function browserRead(config: BrowserAgentConfig) {
  return defineTool({
    name: 'browser_read',
    description: 'Read the text content at a CSS selector on the current page.',
    schema: {
      type: 'object',
      properties: { selector: { type: 'string' } },
      required: ['selector'],
    } as const,
    async execute({ selector }) {
      const text = await config.page.textContent(String(selector))
      return { text }
    },
  })
}

export function browserScreenshot(config: BrowserAgentConfig) {
  return defineTool({
    name: 'browser_screenshot',
    description: 'Capture a PNG screenshot of the current page; returns base64 bytes.',
    schema: { type: 'object', properties: {} } as const,
    async execute() {
      const b64 = await config.page.screenshot()
      return { contentType: 'image/png', bytesBase64: b64 }
    },
  })
}

export function browserWait(config: BrowserAgentConfig) {
  return defineTool({
    name: 'browser_wait_for',
    description: 'Wait for a selector to appear on the current page.',
    schema: {
      type: 'object',
      properties: { selector: { type: 'string' }, timeout_ms: { type: 'number' } },
      required: ['selector'],
    } as const,
    async execute({ selector, timeout_ms }) {
      await config.page.waitForSelector(String(selector), { timeoutMs: timeout_ms as number | undefined })
      return { ok: true }
    },
  })
}

export function browserAgent(config: BrowserAgentConfig) {
  return [
    browserGoto(config),
    browserClick(config),
    browserFill(config),
    browserRead(config),
    browserScreenshot(config),
    browserWait(config),
  ]
}
