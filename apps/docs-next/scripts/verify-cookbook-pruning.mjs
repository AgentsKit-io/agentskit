#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const root = resolve(import.meta.dirname, '../../..')
const app = resolve(root, 'apps/docs-next')
const removed = {
  streaming: '/docs/get-started/getting-started/quickstart',
  'rate-limit': '/docs/production/security/rate-limiting',
  'tool-confirmation': '/docs/agents/hitl',
  'edge-deployment': '/docs/production/edge',
}
const retiredPublicPages = {
  'templates-cookbook': '/docs/reference/packages/templates',
  'figma-design-extraction': '/docs/agents/tools/integrations/figma',
  'hubspot-airtable-shopify-pulse': '/docs/agents/tools/integrations/hubspot',
  'jira-triage': '/docs/agents/tools/integrations/jira',
  'sentry-incident-bot': '/docs/agents/tools/integrations/sentry',
}
const duplicateReferencePages = {
  integrations: '/docs/agents/tools/integrations',
  'more-providers': '/docs/data/providers/hosted',
}
const allRetiredPages = { ...retiredPublicPages, ...duplicateReferencePages }
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const arg = process.argv[2]

if (arg === '--redirects') {
  for (const [slug, destination] of Object.entries(removed)) {
    const response = await fetch(`http://localhost:3111/docs/cookbook/${slug}`, { redirect: 'manual' })
    assert.equal(response.status, 308, `${slug} should return a permanent redirect`)
    assert.equal(response.headers.get('location'), destination, `${slug} should redirect to ${destination}`)
  }
  for (const [slug, destination] of Object.entries(allRetiredPages)) {
    const response = await fetch(`http://localhost:3111/docs/reference/recipes/${slug}`, { redirect: 'manual' })
    assert.equal(response.status, 308, `${slug} should return a permanent redirect`)
    assert.equal(response.headers.get('location'), destination, `${slug} should redirect to ${destination}`)
  }
  console.log(JSON.stringify({ status: 'passed', criteria: ['legacy-urls-preserved', 'unlisted-usecase-recipes-pruned', 'duplicate-reference-recipes-pruned'], routes: Object.keys(removed).length + Object.keys(allRetiredPages).length }))
} else if (arg === '--browser') {
  const baseUrl = (process.env.AGENTSKIT_BASE_URL ?? 'http://localhost:3111').replace(/\/$/, '')
  const output = resolve(root, '.codex/verification/ui/site/agentskit')
  mkdirSync(output, { recursive: true })
  const errors = []
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  // Vercel analytics scripts only exist on deployments; failed responses are reported with their URL below.
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(message.text()) })
  page.on('response', (response) => { if (response.status() >= 400 && !new URL(response.url()).pathname.startsWith('/_vercel/')) errors.push(`${response.status()} ${response.url()}`) })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('requestfailed', (request) => new URL(request.url()).pathname.startsWith('/_vercel/') || errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'request failed'}`))
  const artifacts = []
  const routes = [
    ...Object.entries(removed).map(([slug, destination]) => [`/docs/cookbook/${slug}`, destination]),
    ...Object.entries(allRetiredPages).map(([slug, destination]) => [`/docs/reference/recipes/${slug}`, destination]),
  ]
  const results = []
  for (const [source, destination] of routes) {
    const response = await page.goto(`${baseUrl}${source}`, { waitUntil: 'domcontentloaded' })
    await page.locator('#nd-page h1').waitFor({ state: 'visible', timeout: 15000 })
    const askPanel = page.locator('[data-ak-ask-panel]')
    const closeAsk = askPanel.locator('button[aria-label="Close"]')
    if (await closeAsk.isVisible()) await closeAsk.click({ timeout: 5000 })
    const heading = await page.locator('#nd-page h1').textContent().catch(() => '')
    const finalPath = new URL(page.url()).pathname
    const passed = response?.status() === 200 && finalPath === destination && Boolean(heading?.trim())
    results.push({ id: `redirect-renders:${source}`, status: passed ? 'passed' : 'failed', detail: { httpStatus: response?.status(), finalPath, heading: heading?.trim() ?? '' } })
    const path = resolve(output, `redirect-${source.split('/').at(-1)}.png`)
    await page.screenshot({ path })
    artifacts.push({ type: 'screenshot', path: path.replace(`${root}/`, ''), sha256: createHash('sha256').update(readFileSync(path)).digest('hex'), viewport: '1440x960' })
  }
  const recipeIndexResponse = await page.goto(`${baseUrl}/recipes`, { waitUntil: 'domcontentloaded' })
  const recipeIndex = await page.evaluate(() => ({
    heading: document.querySelector('main h1')?.textContent.trim() ?? '',
    countLabel: document.querySelector('main header p:nth-of-type(3)')?.textContent.trim() ?? '',
    links: [...document.querySelectorAll('a[href^="/docs/reference/recipes/"]')].map((anchor) => anchor.getAttribute('href')),
    linksHaveNames: [...document.querySelectorAll('a[href^="/docs/reference/recipes/"]')].every((anchor) => (anchor.getAttribute('aria-label') ?? anchor.textContent).trim().length > 0),
    mainLandmark: Boolean(document.querySelector('main')),
    h1Count: document.querySelectorAll('main h1').length,
    contrast: (() => {
      const title = document.querySelector('main ul a[href^="/docs/reference/recipes/"] h2')
      const link = title?.closest('a')
      const foreground = title ? getComputedStyle(title).color : ''
      const background = link ? getComputedStyle(link).backgroundColor : ''
      const channel = (value) => value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4
      const rgb = (value) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? []
      const luminance = (value) => { const [r, g, b] = rgb(value); return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b) }
      const fg = luminance(foreground); const bg = luminance(background)
      return { foreground, background, ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) }
    })(),
    loadMs: Math.round(performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd ?? 0),
  }))
  const hiddenRecipes = ['figma-design-extraction', 'hubspot-airtable-shopify-pulse', 'jira-triage', 'sentry-incident-bot', 'integrations', 'more-providers']
  const removedRecipesAbsent = hiddenRecipes.every((slug) => !recipeIndex.links.includes(`/docs/reference/recipes/${slug}`))
  const recipesPassed = recipeIndexResponse?.status() === 200 && recipeIndex.links.length === 64 && recipeIndex.countLabel.includes('64 standalone recipes') && removedRecipesAbsent && recipeIndex.linksHaveNames && recipeIndex.mainLandmark && recipeIndex.h1Count === 1 && recipeIndex.contrast.ratio >= 4.5
  results.push({ id: 'recipe-index-pruned', status: recipesPassed ? 'passed' : 'failed', detail: { httpStatus: recipeIndexResponse?.status(), ...recipeIndex, removedRecipesAbsent } })
  const firstRecipe = page.locator('main ul a[href^="/docs/reference/recipes/"]').first()
  const firstRecipePath = new URL(await firstRecipe.getAttribute('href'), baseUrl).pathname
  await firstRecipe.click()
  await page.waitForURL((url) => url.pathname === firstRecipePath, { timeout: 15000 }).catch(() => {})
  const interactionPassed = new URL(page.url()).pathname === firstRecipePath && Boolean((await page.locator('#nd-page h1').textContent().catch(() => '')).trim())
  results.push({ id: 'recipe-card-navigation', status: interactionPassed ? 'passed' : 'failed', detail: { expectedPath: firstRecipePath, actualPath: new URL(page.url()).pathname } })
  await page.goto(`${baseUrl}/recipes`, { waitUntil: 'domcontentloaded' })
  const recipeIndexPath = resolve(output, 'recipe-index.png')
  await page.screenshot({ path: recipeIndexPath })
  artifacts.push({ type: 'screenshot', path: recipeIndexPath.replace(`${root}/`, ''), sha256: createHash('sha256').update(readFileSync(recipeIndexPath)).digest('hex'), viewport: '1440x960' })
  await page.setViewportSize({ width: 390, height: 844 })
  const mobileResponse = await page.goto(`${baseUrl}/docs/cookbook`, { waitUntil: 'domcontentloaded' })
  await page.locator('#nd-page h1').waitFor({ state: 'visible', timeout: 15000 })
  const askPanel = page.locator('[data-ak-ask-panel]')
  const closeAsk = askPanel.locator('button[aria-label="Close"]')
  if (await closeAsk.isVisible()) await closeAsk.click({ timeout: 5000 })
  const mobile = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, heading: document.querySelector('#nd-page h1')?.textContent.trim() ?? '' }))
  const mobilePath = resolve(output, 'cookbook-mobile.png')
  await page.screenshot({ path: mobilePath })
  artifacts.push({ type: 'screenshot', path: mobilePath.replace(`${root}/`, ''), sha256: createHash('sha256').update(readFileSync(mobilePath)).digest('hex'), viewport: '390x844' })
  results.push({ id: 'docs-mobile-layout', status: mobileResponse?.status() === 200 && !mobile.overflow ? 'passed' : 'failed', detail: { httpStatus: mobileResponse?.status(), ...mobile } })
  const mobileRecipeResponse = await page.goto(`${baseUrl}/recipes`, { waitUntil: 'domcontentloaded' })
  const mobileRecipes = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, count: document.querySelectorAll('a[href^="/docs/reference/recipes/"]').length }))
  const mobileRecipePath = resolve(output, 'recipes-mobile.png')
  await page.screenshot({ path: mobileRecipePath })
  artifacts.push({ type: 'screenshot', path: mobileRecipePath.replace(`${root}/`, ''), sha256: createHash('sha256').update(readFileSync(mobileRecipePath)).digest('hex'), viewport: '390x844' })
  results.push({ id: 'recipe-index-mobile', status: mobileRecipeResponse?.status() === 200 && !mobileRecipes.overflow && mobileRecipes.count === 64 ? 'passed' : 'failed', detail: { httpStatus: mobileRecipeResponse?.status(), ...mobileRecipes } })
  results.push({ id: 'browser-errors', status: errors.length ? 'failed' : 'passed', detail: errors })
  await browser.close()
  const report = { status: results.every((item) => item.status === 'passed') ? 'passed' : 'failed', capability: 'real-browser', criteria: ['legacy-urls-preserved', 'unlisted-usecase-recipes-pruned', 'duplicate-reference-recipes-pruned'], results, artifacts }
  writeFileSync(resolve(output, 'docs-routes-result.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report))
  if (report.status !== 'passed') process.exitCode = 1
} else if (arg === '--indexes') {
  const context = read('apps/docs-next/lib/ask-context.ts')
  const askIndex = JSON.parse(read('apps/docs-next/lib/ask-index/index.json'))
  const bridge = JSON.stringify(JSON.parse(read('.doc-bridge/index.json')))
  const llms = read('llms.txt')
  for (const slug of Object.keys(removed)) {
    assert.ok(!context.includes(`/docs/cookbook/${slug}`), `Ask Docs context still contains ${slug}`)
    assert.ok(!askIndex.records.some((record) => record.metadata?.path === `/docs/cookbook/${slug}`), `Ask Docs index still contains ${slug}`)
    assert.ok(!bridge.includes(`cookbook/${slug}.mdx`), `Doc Bridge index still contains ${slug}`)
    assert.ok(!llms.includes(`/docs/cookbook/${slug}`), `llms.txt still contains ${slug}`)
  }
  for (const slug of Object.keys(allRetiredPages)) {
    assert.ok(!context.includes(`/docs/reference/recipes/${slug}`), `Ask Docs context still contains ${slug}`)
    assert.ok(!askIndex.records.some((record) => record.metadata?.path === `/docs/reference/recipes/${slug}`), `Ask Docs index still contains ${slug}`)
    assert.ok(!bridge.includes(`reference/recipes/${slug}.mdx`), `Doc Bridge index still contains ${slug}`)
    assert.ok(!llms.includes(`/docs/reference/recipes/${slug}`), `llms.txt still contains ${slug}`)
  }
  console.log(JSON.stringify({ status: 'passed', criteria: ['derived-docs-refreshed', 'unlisted-usecase-recipes-pruned', 'duplicate-reference-recipes-pruned'], askChunks: askIndex.records.length }))
} else {
  const meta = JSON.parse(read('apps/docs-next/content/docs/cookbook/meta.json'))
  const index = read('apps/docs-next/content/docs/cookbook/index.mdx')
  const redirects = read('apps/docs-next/next.config.mjs')
  assert.deepEqual(meta.pages.filter((page) => page !== 'index'), [
    'tools-memory', 'auth', 'error-boundary', 'structured-output', 'multi-agent', 'rag',
    'ask-the-docs', 'deterministic-docs-answers', 'observability',
  ])
  for (const [slug, destination] of Object.entries(removed)) {
    assert.ok(!existsSync(resolve(app, `content/docs/cookbook/${slug}.mdx`)), `${slug}.mdx should be removed`)
    assert.ok(!index.includes(`/docs/cookbook/${slug}`), `Cookbook index still links to ${slug}`)
    assert.ok(redirects.includes(`source: '/docs/cookbook/${slug}', destination: '${destination}', permanent: true`), `Missing permanent redirect for ${slug}`)
  }
  for (const [slug, destination] of Object.entries(allRetiredPages)) {
    assert.ok(!existsSync(resolve(app, `content/docs/reference/recipes/${slug}.mdx`)), `${slug}.mdx should be removed`)
    assert.ok(redirects.includes(`source: '/docs/reference/recipes/${slug}', destination: '${destination}', permanent: true`), `Missing permanent redirect for ${slug}`)
  }
  assert.ok(read('apps/docs-next/content/docs/reference/index.mdx').includes('64 copy-paste solutions'), 'Reference index should show the remaining 64 recipes')
  assert.ok(read('apps/docs-next/content/docs/get-started/getting-started/quickstart.mdx').includes('chat.stop()'))
  assert.ok(read('apps/docs-next/content/docs/production/security/rate-limiting.mdx').includes('limiter.check(request)'))
  assert.ok(read('apps/docs-next/content/docs/agents/hitl.mdx').includes('defineZodTool'))
  assert.ok(read('apps/docs-next/content/docs/agents/hitl.mdx').includes('/docs/ui/tool-confirmation'))
  assert.ok(read('apps/docs-next/content/docs/production/edge.mdx').includes('createSource'))
  console.log(JSON.stringify({ status: 'passed', criteria: ['cookbook-pruned', 'unlisted-usecase-recipes-pruned', 'duplicate-reference-recipes-pruned'], remainingCookbookPages: meta.pages.length - 1, remainingRecipes: 64, removedPages: Object.keys(removed).length + Object.keys(allRetiredPages).length }))
}
