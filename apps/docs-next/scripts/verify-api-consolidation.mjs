#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const root = resolve(import.meta.dirname, '../../..')
const app = resolve(root, 'apps/docs-next')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const routes = JSON.parse(read('apps/docs-next/lib/api-symbol-routes.json'))
const packages = JSON.parse(read('apps/docs-next/content/docs/api/meta.json')).pages
const arg = process.argv[2]

const pages = []
for (const pkg of packages) {
  const dir = resolve(app, `content/docs/api/${pkg}`)
  pages.push(...readdirSync(dir).filter((file) => file.endsWith('.md')).map((file) => `api/${pkg}/${file.slice(0, -3)}`))
}
const anchors = new Map()
for (const route of pages) {
  const content = read(`apps/docs-next/content/docs/${route}.md`)
  anchors.set(`/docs/${route}`, new Set([...content.matchAll(/<a id="([^"]+)"><\/a>/g)].map((match) => match[1])))
}

if (arg === '--browser') {
  const baseUrl = (process.env.AGENTSKIT_BASE_URL ?? 'http://localhost:3111').replace(/\/$/, '')
  const output = resolve(root, '.codex/verification/ui/site/api-consolidation')
  mkdirSync(output, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const errors = []
  const artifacts = []
  const results = []
  const [sitemapResponse, fullResponse] = await Promise.all([
    fetch(`${baseUrl}/sitemap.xml`),
    fetch(`${baseUrl}/llms-full.txt`),
  ])
  const sitemap = await sitemapResponse.text()
  const llmsFull = await fullResponse.text()
  const sitemapApiRoutes = [...sitemap.matchAll(/<loc>[^<]*\/docs\/api(?:\/[^<]*)?<\/loc>/g)].length
  const expectedApiRoutes = pages.length + packages.length + 1
  const llmsSymbolRoutes = Object.keys(routes).filter((route) => llmsFull.includes(`/docs/${route})`) || llmsFull.includes(`/docs/${route}\n`)).length
  results.push({ id: 'generated-doc-indexes', status: sitemapResponse.ok && fullResponse.ok && sitemapApiRoutes === expectedApiRoutes && llmsSymbolRoutes === 0 ? 'passed' : 'failed', detail: { sitemapStatus: sitemapResponse.status, sitemapApiRoutes, expectedApiRoutes, llmsStatus: fullResponse.status, llmsSymbolRoutes } })
  const samples = [
    Object.keys(routes).find((route) => route.startsWith('api/core/classes/')),
    Object.keys(routes).find((route) => route.startsWith('api/adapters/interfaces/')),
    Object.keys(routes).find((route) => route.startsWith('api/observability/interfaces/')),
  ].filter(Boolean)
  assert.equal(samples.length, 3, 'need representative class/interface routes in three packages')
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  page.setDefaultNavigationTimeout(60000)
  // Vercel analytics scripts only exist on deployments; failed responses are reported with their URL below.
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(message.text()) })
  page.on('response', (response) => { if (response.status() >= 400 && !new URL(response.url()).pathname.startsWith('/_vercel/')) errors.push(`${response.status()} ${response.url()}`) })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('requestfailed', (request) => new URL(request.url()).pathname.startsWith('/_vercel/') || errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'request failed'}`))
  for (const route of samples) {
    const source = `/docs/${route}${route.startsWith('api/core/classes/') ? '.md' : ''}`
    const expected = routes[route]
    const response = await page.goto(`${baseUrl}${source}`, { waitUntil: 'domcontentloaded' })
    const id = decodeURIComponent(new URL(expected, baseUrl).hash.slice(1))
    await page.locator(`#${id}`).waitFor({ state: 'attached', timeout: 15000 })
    const final = `${new URL(page.url()).pathname}${new URL(page.url()).hash}`
    const heading = (await page.locator('main h2').first().textContent())?.trim() ?? ''
    const ok = response?.status() === 200 && final === expected && heading.includes(route.split('/').at(-1))
    results.push({ id: `old-symbol-route:${route}`, status: ok ? 'passed' : 'failed', detail: { final, expected, heading, httpStatus: response?.status() } })
    const desktop = await page.evaluate(() => {
      const main = document.querySelector('main')
      const title = main?.querySelector('h2')
      const color = (value) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0]
      const channel = (value) => value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4
      const luminance = (value) => { const [r, g, b] = color(value).map(channel); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
      let surface = title
      while (surface && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') surface = surface.parentElement
      const fg = title ? getComputedStyle(title).color : 'rgb(0, 0, 0)'
      const bg = surface ? getComputedStyle(surface).backgroundColor : getComputedStyle(document.body).backgroundColor
      const l1 = luminance(fg); const l2 = luminance(bg)
      return {
        h1Count: main?.querySelectorAll('h1').length ?? 0,
        mainLandmark: Boolean(main),
        linksHaveNames: [...(main?.querySelectorAll('a') ?? [])].every((a) => (a.getAttribute('aria-label') ?? a.textContent).trim().length > 0),
        imagesHaveAlt: [...(main?.querySelectorAll('img') ?? [])].every((img) => img.hasAttribute('alt')),
        textOverflow: [...(main?.querySelectorAll('h1,h2,h3,p,li') ?? [])].some((el) => getComputedStyle(el).textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2),
        contrast: { foreground: fg, background: bg, ratio: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) },
        domContentLoadedMs: Math.round(performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd ?? 0),
      }
    })
    const uiOk = desktop.h1Count === 1 && desktop.mainLandmark && desktop.linksHaveNames && desktop.imagesHaveAlt && !desktop.textOverflow && desktop.contrast.ratio >= 4.5 && desktop.domContentLoadedMs < 12000
    results.push({ id: `docs-ui:${route}`, status: uiOk ? 'passed' : 'failed', detail: desktop })
    const path = resolve(output, `${route.split('/').slice(-2).join('-')}.png`)
    await page.screenshot({ path, fullPage: false })
    artifacts.push({ type: 'screenshot', path: path.replace(`${root}/`, ''), sha256: createHash('sha256').update(readFileSync(path)).digest('hex'), viewport: '1440x960' })
    if (route.startsWith('api/core/classes/')) {
      const crossReference = page.locator('main a[href*="#class-agentskiterror"]').first()
      await crossReference.click({ timeout: 10000 })
      await page.waitForURL('**#class-agentskiterror', { timeout: 10000 })
      results.push({ id: 'cross-reference-interaction', status: new URL(page.url()).hash === '#class-agentskiterror' ? 'passed' : 'failed', detail: { url: page.url() } })
      await page.keyboard.press('Tab')
      results.push({ id: 'keyboard-focus', status: await page.evaluate(() => document.activeElement !== document.body) ? 'passed' : 'failed', detail: { activeElement: await page.evaluate(() => document.activeElement?.tagName ?? '') } })
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const mobileResponse = await page.goto(`${baseUrl}/docs/api/core/interfaces`, { waitUntil: 'domcontentloaded' })
  const mobile = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, h1: document.querySelector('main h1')?.textContent.trim() ?? '' }))
  const mobilePath = resolve(output, 'api-category-mobile.png')
  await page.screenshot({ path: mobilePath, fullPage: false })
  artifacts.push({ type: 'screenshot', path: mobilePath.replace(`${root}/`, ''), sha256: createHash('sha256').update(readFileSync(mobilePath)).digest('hex'), viewport: '390x844' })
  results.push({ id: 'api-category-mobile', status: mobileResponse?.status() === 200 && !mobile.overflow && Boolean(mobile.h1) ? 'passed' : 'failed', detail: { httpStatus: mobileResponse?.status(), ...mobile } })
  results.push({ id: 'browser-errors', status: errors.length ? 'failed' : 'passed', detail: errors })
  await browser.close()
  const report = { status: results.every((result) => result.status === 'passed') ? 'passed' : 'failed', capability: 'real-browser', criteria: ['api-deep-links-preserved', 'api-route-count-reduced'], results, artifacts }
  writeFileSync(resolve(output, 'result.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report))
  if (report.status !== 'passed') process.exitCode = 1
} else {
  assert.equal(packages.length, 8, 'all packages should be present')
  assert.ok(pages.length <= 8 * 12, 'category pages should track TypeDoc categories, not symbols')
  const anchorCount = [...anchors.values()].reduce((total, set) => total + set.size, 0)
  assert.equal(Object.keys(routes).length, anchorCount, 'every symbol section needs an old-route mapping')
  const symbolAnchors = new Set()
  for (const [route, destination] of Object.entries(routes)) {
    assert.match(route, /^api\/[a-z-]+\/[a-z-]+\/[A-Za-z0-9_$.-]+$/)
    assert.match(destination, /^\/docs\/api\/[a-z-]+\/[a-z-]+#[a-z0-9-]+$/)
    const [path, anchor] = destination.split('#')
    assert.ok(anchors.get(path)?.has(anchor), `${route} target anchor ${destination} must exist`)
    assert.ok(!symbolAnchors.has(destination), `duplicate symbol target ${destination}`)
    symbolAnchors.add(destination)
  }
  for (const route of pages) {
    const content = read(`apps/docs-next/content/docs/${route}.md`)
    for (const [, path, anchor] of content.matchAll(/\]\((\/docs\/api\/[a-z-]+\/[a-z-]+)#([a-z0-9-]+)(?:#[^)]+)?\)/g)) {
      assert.ok(anchors.get(path)?.has(anchor), `cross-reference target ${path}#${anchor} must exist`)
    }
  }
  assert.equal(symbolAnchors.size, anchorCount)
  if (arg === '--routes') {
    console.log(JSON.stringify({ status: 'passed', criteria: ['api-deep-links-preserved', 'api-route-count-reduced'], apiPages: pages.length + packages.length, symbols: Object.keys(routes).length }))
  } else {
    for (const route of pages) {
      const content = read(`apps/docs-next/content/docs/${route}.md`)
      assert.match(content, /^---\n/m, `${route} needs frontmatter`)
    }
    console.log(JSON.stringify({ status: 'passed', criteria: ['api-symbols-grouped', 'api-deep-links-preserved', 'api-route-count-reduced'], apiPages: pages.length + packages.length, symbols: Object.keys(routes).length }))
  }
}
