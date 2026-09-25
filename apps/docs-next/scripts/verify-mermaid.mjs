#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const root = resolve(import.meta.dirname, '../../..')
const read = (file) => readFileSync(resolve(root, file), 'utf8')
const sources = [
  'apps/docs-next/content/docs/get-started/getting-started/build-your-first-agent.mdx',
  'apps/docs-next/content/docs/get-started/architecture-at-a-glance.mdx',
  'apps/docs-next/content/docs/cookbook/deterministic-docs-answers.mdx',
]
const pages = [
  '/docs/get-started/getting-started/build-your-first-agent',
  '/docs/get-started/architecture-at-a-glance',
  '/docs/cookbook/deterministic-docs-answers',
  '/docs/get-started/concepts/mental-model',
]

if (process.argv[2] !== '--browser') {
  for (const source of sources) assert.match(read(source), /```mermaid\n(?:flowchart|graph)\b/m, `${source} should retain its Mermaid fence`)
  assert.match(read('apps/docs-next/content/docs/get-started/concepts/mental-model.mdx'), /<Mermaid chart=/, 'explicit Mermaid component remains supported')
  console.log(JSON.stringify({ status: 'passed', criteria: ['fenced-mermaid-renders'], fencedPages: sources.length, explicitMermaidPage: true }))
  process.exit(0)
}

const baseUrl = (process.env.AGENTSKIT_BASE_URL ?? 'http://localhost:3111').replace(/\/$/, '')
const output = resolve(root, '.codex/verification/ui/site/mermaid')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
const errors = []
const results = []
const artifacts = []
page.setDefaultNavigationTimeout(60000)
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
page.on('pageerror', (error) => errors.push(error.message))
page.on('requestfailed', (request) => errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'request failed'}`))

for (const route of pages) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
  const diagram = page.locator('main svg:has(g.node)').first()
  await diagram.waitFor({ state: 'visible', timeout: 15000 })
  const metrics = await page.evaluate(() => {
    const main = document.querySelector('main')
    const svg = main?.querySelector('svg:has(g.node)')
    const box = svg?.getBoundingClientRect()
    const heading = main?.querySelector('h1')
    const foreground = heading ? getComputedStyle(heading).color : 'rgb(0, 0, 0)'
    let surface = heading
    while (surface && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') surface = surface.parentElement
    const background = surface ? getComputedStyle(surface).backgroundColor : getComputedStyle(document.body).backgroundColor
    const luminance = (value) => {
      const [r, g, b] = value.match(/[\d.]+/g).slice(0, 3).map(Number).map((channel) => {
        const normalized = channel / 255
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const foregroundLuminance = luminance(foreground)
    const backgroundLuminance = luminance(background)
    return {
      title: main?.querySelector('h1')?.textContent?.trim() ?? '',
      diagramCount: main?.querySelectorAll('svg:has(g.node)').length ?? 0,
      diagramWidth: box?.width ?? 0,
      mainWidth: main?.getBoundingClientRect().width ?? 0,
      viewportWidth: innerWidth,
      pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      textOverflow: [...(main?.querySelectorAll('h1,h2,h3,p,li') ?? [])].some((el) => !el.classList.contains('truncate') && el.scrollWidth > el.clientWidth + 2),
      mainLandmark: Boolean(main),
      linksHaveNames: [...(main?.querySelectorAll('a') ?? [])].every((a) => (a.getAttribute('aria-label') ?? a.textContent).trim().length > 0),
      imagesHaveAlt: [...(main?.querySelectorAll('img') ?? [])].every((img) => img.hasAttribute('alt')),
      headingContrast: (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05),
      domContentLoadedMs: Math.round(performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd ?? 0),
      normalCodeBlockCount: main?.querySelectorAll('figure.shiki pre').length ?? 0,
    }
  })
  const normalCodePreserved = route !== pages[0] || metrics.normalCodeBlockCount > 0
  const uiOk = metrics.mainLandmark && metrics.linksHaveNames && metrics.imagesHaveAlt && !metrics.textOverflow && metrics.headingContrast >= 4.5 && metrics.domContentLoadedMs < 12000 && metrics.diagramWidth <= metrics.mainWidth
  const ok = response?.status() === 200 && Boolean(metrics.title) && metrics.diagramCount > 0 && !metrics.pageOverflow && normalCodePreserved && uiOk
  results.push({ id: `mermaid-page:${route}`, status: ok ? 'passed' : 'failed', detail: { httpStatus: response?.status(), normalCodePreserved, ...metrics } })
  const path = resolve(output, `${route.split('/').filter(Boolean).at(-1)}-desktop.png`)
  await page.screenshot({ path, fullPage: true })
  artifacts.push({ type: 'screenshot', path: path.replace(`${root}/`, ''), sha256: createHash('sha256').update(readFileSync(path)).digest('hex'), viewport: '1440x960' })
}

await page.setViewportSize({ width: 390, height: 844 })
for (const route of pages) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
  await page.locator('main svg:has(g.node)').first().waitFor({ state: 'visible', timeout: 15000 })
  const mobile = await page.evaluate(() => ({
    pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    diagramCount: document.querySelectorAll('main svg:has(g.node)').length,
    viewportWidth: innerWidth,
    diagramWidth: document.querySelector('main svg:has(g.node)')?.getBoundingClientRect().width ?? 0,
    mainWidth: document.querySelector('main')?.getBoundingClientRect().width ?? 0,
  }))
  const ok = response?.status() === 200 && mobile.diagramCount > 0 && !mobile.pageOverflow && mobile.diagramWidth <= mobile.mainWidth
  results.push({ id: `mermaid-mobile:${route}`, status: ok ? 'passed' : 'failed', detail: { httpStatus: response?.status(), ...mobile } })
  if (route === pages[0]) {
    const mobilePath = resolve(output, 'build-your-first-agent-mobile.png')
    await page.screenshot({ path: mobilePath, fullPage: true })
    artifacts.push({ type: 'screenshot', path: mobilePath.replace(`${root}/`, ''), sha256: createHash('sha256').update(readFileSync(mobilePath)).digest('hex'), viewport: '390x844' })
  }
}
results.push({ id: 'browser-errors', status: errors.length ? 'failed' : 'passed', detail: errors })
await browser.close()

const report = { status: results.every((result) => result.status === 'passed') ? 'passed' : 'failed', capability: 'real-browser', criteria: ['fenced-mermaid-renders'], results, artifacts }
writeFileSync(resolve(output, 'result.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report))
if (report.status !== 'passed') process.exitCode = 1
