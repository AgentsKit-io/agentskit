#!/usr/bin/env node
/**
 * Ecosystem visual/UX regression check for every public AgentsKit site.
 *
 * For each site × {home, docs} × {light, dark} × {1440×960, 390×844} it loads the
 * page in Chromium and asserts that the shared shell (v1) bar is present with
 * the six products in order, the current product and the Star target are
 * right, the <agentskit-footer> upgraded, nothing overflows horizontally, no
 * console errors fired, and every visible text run in the bar, product
 * header, above-the-fold hero, and footer meets WCAG AA contrast. Contrast is
 * measured on rendered pixels (a normal screenshot against the same frame
 * with glyphs made transparent), never from CSS values, and there is no
 * pixel-diff baseline that could mask text. Full-page screenshots are saved.
 *
 *   node scripts/verify-ecosystem-visual.mjs                       # production
 *   node scripts/verify-ecosystem-visual.mjs --sites chat,harness --themes light
 *   node scripts/verify-ecosystem-visual.mjs --agentskit-origin http://localhost:3000 \
 *     --shell-origin http://localhost:3000 --scope shell          # shell PR: local shell everywhere
 *
 * Writes <out>/results.json, <out>/summary.md, <out>/screenshots/*.jpg and
 * appends the summary to $GITHUB_STEP_SUMMARY. Exits 1 when any check fails.
 */

import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { chromium } from '@playwright/test'
import {
  PAGES, THEMES, VIEWPORTS, applyScope, ecosystemSites, formatSummary, isOccluded, measureTextContrast, rebaseSite, requiredContrast,
} from './lib/ecosystem-visual.mjs'

const root = resolve(import.meta.dirname, '..')
const { values: args } = parseArgs({
  options: {
    sites: { type: 'string' },
    pages: { type: 'string' },
    themes: { type: 'string' },
    viewports: { type: 'string' },
    out: { type: 'string', default: join(root, 'test-results/ecosystem-visual') },
    'shell-origin': { type: 'string' },
    'agentskit-origin': { type: 'string' },
    scope: { type: 'string', default: 'all' },
    concurrency: { type: 'string', default: '3' },
  },
})
const pick = (list, value, key = (entry) => entry) => (value ? list.filter((entry) => value.split(',').includes(key(entry))) : list)

const ecosystem = JSON.parse(readFileSync(join(root, 'ecosystem.json'), 'utf8'))
let sites = pick(ecosystemSites(ecosystem), args.sites, (site) => site.id)
if (args['agentskit-origin']) sites = sites.map((site) => (site.id === 'agentskit' ? rebaseSite(site, args['agentskit-origin']) : site))
const jobs = sites.flatMap((site) => pick(PAGES, args.pages).flatMap((page) =>
  pick(THEMES, args.themes).flatMap((theme) => pick(VIEWPORTS, args.viewports, (v) => v.id).map((viewport) => ({ site, page, theme, viewport })))))
const shotsDir = join(args.out, 'screenshots')
mkdirSync(shotsDir, { recursive: true })

const SCALE = 2
const SHELL_ASSET = /^https:\/\/([a-z0-9-]+\.)*agentskit\.io\/(shell\/v1\.(js|css)|ecosystem-bar\.js)(\?.*)?$/
const HIDE_GLYPHS_CSS = '*,*::before,*::after,*::marker,*::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important;caret-color:transparent!important;transition:none!important}'

// ---------- in-page probes (serialised into the page; keep self-contained) ----------

function probeShell() {
  const bar = document.querySelectorAll('#ak-eco')
  const barEl = bar[0]
  const links = barEl ? [...barEl.querySelectorAll('.ak-eco-products a.ak-eco-link')] : []
  const footers = document.querySelectorAll('agentskit-footer')
  const footer = footers[0]
  const upgraded = footer?.shadowRoot?.querySelector('footer.akf')
  const width = document.documentElement.clientWidth
  const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
  const describe = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '')
  const offenders = scrollWidth > width + 1
    ? [...document.body.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > width + 1 && el.getBoundingClientRect().width > 0)
      .filter((el, _, all) => !all.includes(el.parentElement)).slice(0, 5)
      .map((el) => `${describe(el)} (right ${Math.round(el.getBoundingClientRect().right)}px)`)
    : []
  const html = document.documentElement
  let resolvedTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  if (html.classList.contains('dark') || html.dataset.theme === 'dark') resolvedTheme = 'dark'
  else if (html.classList.contains('light') || html.dataset.theme === 'light') resolvedTheme = 'light'
  return {
    barCount: bar.length,
    barVisible: Boolean(barEl && barEl.getBoundingClientRect().height > 0 && barEl.checkVisibility()),
    products: links.map((a) => ({ label: a.textContent.trim(), url: a.href })),
    current: links.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.textContent.trim()),
    star: barEl?.querySelector('a[data-ak-eco-star]')?.href ?? null,
    footerCount: footers.length,
    footerUpgraded: Boolean(upgraded && upgraded.getBoundingClientRect().height > 0),
    overflow: { width, scrollWidth, offenders },
    resolvedTheme,
  }
}

/** Visible text runs of the requested regions that are fully painted inside the viewport. */
function collectTextRuns(requested) {
  const vw = innerWidth
  const vh = innerHeight
  const up = (node) => node.parentNode ?? node.host ?? null
  const within = (node, el) => { for (let n = node; n; n = up(n)) if (n === el) return true; return false }
  const bar = document.getElementById('ak-eco')
  const footers = [...document.querySelectorAll('agentskit-footer, footer')].filter((f) => !f.parentElement?.closest('agentskit-footer'))
  const headers = [...document.querySelectorAll('header, #nd-nav, #nd-subnav')].filter((h) => h.getBoundingClientRect().top < 240 && !h.closest('article, footer'))
  const excluded = [...document.querySelectorAll('aside, #nd-sidebar, [data-sidebar], #nd-toc, [role="dialog"]')]
  const heroRoot = document.querySelector('main') ?? document.body
  const regionOf = (node) => {
    if (bar && within(node, bar)) return 'bar'
    if (footers.some((f) => within(node, f))) return 'footer'
    if (headers.some((h) => within(node, h))) return 'header'
    if (excluded.some((e) => within(node, e))) return null
    return within(node, heroRoot) ? 'hero' : null
  }
  const hiddenByAria = (node) => { for (let n = node; n; n = up(n)) if (n.nodeType === 1 && (n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('inert') || n.disabled)) return true; return false }
  const deepAt = (x, y) => {
    let el = document.elementFromPoint(x, y)
    while (el?.shadowRoot) { const inner = el.shadowRoot.elementFromPoint(x, y); if (!inner || inner === el) break; el = inner }
    return el
  }
  const clipOf = (el) => {
    let box = { left: 0, top: 0, right: vw, bottom: vh }
    for (let n = up(el); n && n.nodeType === 1; n = up(n)) {
      const cs = getComputedStyle(n)
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
      const r = n.getBoundingClientRect()
      box = { left: Math.max(box.left, r.left), top: Math.max(box.top, r.top), right: Math.min(box.right, r.right), bottom: Math.min(box.bottom, r.bottom) }
    }
    return box
  }
  const path = (el) => {
    const parts = []
    for (let n = el; n && parts.length < 4; n = up(n)) {
      if (n.nodeType === 11) { parts.unshift('>>>'); continue }
      if (n.nodeType !== 1) break
      const cls = typeof n.className === 'string' && n.className.trim() ? `.${n.className.trim().split(/\s+/)[0]}` : ''
      parts.unshift(n.tagName.toLowerCase() + (n.id ? `#${n.id}` : cls))
    }
    return parts.join(' ')
  }
  const runs = []
  const walk = (scope) => {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeType === 1 && /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TEXTAREA|svg)$/.test(n.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    })
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeType === 1) { if (n.shadowRoot) walk(n.shadowRoot); continue }
      const el = n.parentElement
      const text = n.textContent.replace(/\s+/g, ' ').trim()
      if (!el || !/[\p{L}\p{N}]/u.test(text)) continue
      const region = regionOf(n)
      if (!region || !requested.includes(region) || hiddenByAria(n) || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
      let opacity = 1
      for (let a = el; a && a.nodeType === 1; a = up(a)) opacity *= Number(getComputedStyle(a).opacity)
      if (opacity < 0.2) continue // faded-out or mid-transition, not presented as readable text
      const cs = getComputedStyle(el)
      if (cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || cs.color === 'rgba(0, 0, 0, 0)') continue // gradient / clipped-background text
      const range = document.createRange()
      range.selectNodeContents(n)
      const clip = clipOf(el)
      const rects = [...range.getClientRects()].filter((r) => {
        if (r.width < 2 || r.height < 4) return false
        const w = Math.min(r.right, clip.right) - Math.max(r.left, clip.left)
        const h = Math.min(r.bottom, clip.bottom) - Math.max(r.top, clip.top)
        if (w <= 0 || h <= 0 || (w * h) / (r.width * r.height) < 0.9) return false
        const top = deepAt(r.left + r.width / 2, r.top + r.height / 2)
        return Boolean(top && (top === el || within(top, el) || within(el, top)))
      }).map((r) => ({ x: r.left, y: r.top, width: r.width, height: r.height }))
      if (!rects.length) continue
      runs.push({ region, text: text.slice(0, 60), path: path(el), fontSize: Number.parseFloat(cs.fontSize), fontWeight: cs.fontWeight, css: cs.color, opacity, rects })
    }
  }
  walk(document.body)
  return runs
}

function toggleGlyphs({ hide, css }) {
  const roots = [document]
  const find = (scope) => scope.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) { roots.push(el.shadowRoot); find(el.shadowRoot) } })
  find(document)
  for (const scope of roots) {
    const existing = scope.querySelector('style[data-ak-visual-hide]')
    if (!hide) { existing?.remove(); continue }
    if (existing) continue
    const style = document.createElement('style')
    style.setAttribute('data-ak-visual-hide', '')
    style.textContent = css
    ;(scope === document ? document.head : scope).appendChild(style)
  }
}

// ---------- runner ----------

async function measureOnce(page, helper, regions) {
  const runs = await page.evaluate(collectTextRuns, regions)
  if (!runs.length) return []
  const shot = () => page.screenshot({ animations: 'disabled', caret: 'hide', scale: 'device' }).then((b) => b.toString('base64'))
  const normal = await shot()
  await page.evaluate(toggleGlyphs, { hide: true, css: HIDE_GLYPHS_CSS })
  const hidden = await shot()
  await page.evaluate(toggleGlyphs, { hide: false })
  await page.waitForTimeout(250)
  const repeat = await shot()
  const measured = await helper.evaluate(([a, b, c, items, scale]) => window.__akMeasure(a, b, c, items, scale), [normal, hidden, repeat, runs, SCALE])
  return runs.map((run, i) => ({ ...run, ...measured[i], required: requiredContrast(run.fontSize, run.fontWeight) }))
}

/**
 * Measures the text runs in the current viewport. A failure only counts when a second
 * measurement 1.5 s later fails too, so demo animations caught mid-frame never fail a run,
 * and text painted over by another layer is reported as occluded rather than failing.
 */
async function measurePosition(page, helper, regions) {
  const failed = (item) => item.status === 'measured' && item.ratio < item.required
  const settle = (item) => (failed(item) && isOccluded(item) ? { ...item, status: 'occluded' } : item)
  const first = (await measureOnce(page, helper, regions)).map(settle)
  if (!first.some(failed)) return first
  await page.waitForTimeout(1500)
  const key = (item) => `${item.path}|${item.text}`
  const second = new Map((await measureOnce(page, helper, regions)).map((item) => [key(item), settle(item)]))
  return first.map((item) => {
    if (!failed(item)) return item
    const again = second.get(key(item))
    if (!again || again.status !== 'measured') return { ...item, status: again?.status ?? 'unstable' }
    return failed(again) ? item : again
  })
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
      scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 100))
    }
    scrollTo(0, 0)
  })
}

async function runJob(browser, helper, { site, page: pageKind, theme, viewport }) {
  const mobile = viewport.id === 'mobile'
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: SCALE, isMobile: mobile, hasTouch: mobile, colorScheme: theme, reducedMotion: 'reduce',
  })
  await context.addInitScript((t) => { try { localStorage.setItem('theme', t) } catch { /* storage blocked */ } }, theme)
  if (args['shell-origin']) {
    await context.route(SHELL_ASSET, async (route) => {
      const { pathname } = new URL(route.request().url())
      const response = await route.fetch({ url: new URL(pathname, args['shell-origin']).toString() })
      await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': '*' } })
    })
  }
  const page = await context.newPage()
  const errors = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push({ text: message.text(), url: message.location().url ?? '' }) })
  page.on('pageerror', (error) => errors.push({ text: error.message, url: error.stack ?? '' }))
  const url = site.pages[pageKind]
  const run = { site: site.id, page: pageKind, url, theme, viewport: viewport.id, checks: [], contrast: { measured: 0, failing: [], skipped: 0 } }
  const check = (id, ok, detail, items) => run.checks.push({ id, ok: Boolean(ok), detail, ...(items ? { items } : {}) })
  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 60_000 })
    check('page-loads', response && response.status() < 400, `HTTP ${response?.status()} for ${url}`)
    await page.waitForSelector('#ak-eco', { timeout: 15_000 }).catch(() => {})
    await page.evaluate(() => Promise.race([customElements.whenDefined('agentskit-footer'), new Promise((r) => setTimeout(r, 10_000))]))
    await scrollThrough(page)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(600)

    let shell = await page.evaluate(probeShell)
    if (shell.resolvedTheme !== theme) {
      // Sites that ignore the OS preference still expose the Fumadocs theme toggle; use it once.
      const toggle = page.locator('button[aria-label="Toggle Theme"], [data-theme-toggle]').filter({ visible: true }).first()
      if (await toggle.count()) {
        await toggle.click()
        await page.waitForTimeout(600)
        shell = await page.evaluate(probeShell)
      }
    }
    run.resolvedTheme = shell.resolvedTheme
    check('theme-applied', shell.resolvedTheme === theme, `requested ${theme} (OS preference + stored preference + theme toggle), page rendered ${shell.resolvedTheme}`)
    const expectedLabels = site.expectedBar.map((p) => p.label)
    check('bar-present', shell.barCount === 1 && shell.barVisible, `#ak-eco count ${shell.barCount}, visible ${shell.barVisible}`)
    const productsOk = JSON.stringify(shell.products.map((p) => p.label)) === JSON.stringify(expectedLabels)
      && shell.products.every((p, i) => new URL(p.url).host === new URL(site.expectedBar[i].url).host)
    check('bar-products', productsOk, `got ${shell.products.map((p) => `${p.label} (${p.url})`).join(' → ') || 'none'}; expected ${expectedLabels.join(' → ')}`)
    check('bar-current', JSON.stringify(shell.current) === JSON.stringify(site.expectedCurrent ? [site.expectedCurrent] : []), `aria-current on [${shell.current.join(', ')}], expected ${site.expectedCurrent ?? 'none'}`)
    check('bar-star', shell.star === site.expectedStar, `Star → ${shell.star}, expected ${site.expectedStar}`)
    check('footer-upgraded', shell.footerCount === 1 && shell.footerUpgraded, `<agentskit-footer> count ${shell.footerCount}, upgraded ${shell.footerUpgraded}`)
    check('no-horizontal-overflow', shell.overflow.scrollWidth <= shell.overflow.width + 1, `scrollWidth ${shell.overflow.scrollWidth}px vs viewport ${shell.overflow.width}px ${shell.overflow.offenders.join(', ')}`.trim())

    const name = `${site.id}-${pageKind}-${theme}-${viewport.id}.jpg`
    await page.screenshot({ path: join(shotsDir, name), fullPage: true, type: 'jpeg', quality: 70, scale: 'css', animations: 'disabled' })
    run.screenshot = `screenshots/${name}`

    await page.evaluate(() => scrollTo(0, 0))
    await page.waitForTimeout(300)
    const results = await measurePosition(page, helper, ['bar', 'header', 'hero'])
    const footerBox = await page.evaluate(() => {
      const f = document.querySelector('agentskit-footer') ?? [...document.querySelectorAll('footer')].at(-1)
      if (!f) return null
      const r = f.getBoundingClientRect()
      return { top: r.top + scrollY, bottom: r.bottom + scrollY }
    })
    if (footerBox) {
      const seen = new Set()
      for (let y = footerBox.top - 80; y < footerBox.bottom; y += Math.floor(viewport.height * 0.6)) {
        await page.evaluate((top) => scrollTo(0, top), y)
        await page.waitForTimeout(300)
        for (const item of await measurePosition(page, helper, ['footer'])) {
          const key = `${item.path}|${item.text}`
          if (item.status !== 'measured' || seen.has(key)) continue
          seen.add(key)
          results.push(item)
        }
      }
    }
    const measured = results.filter((item) => item.status === 'measured')
    run.contrast.measured = measured.length
    run.contrast.skipped = results.length - measured.length
    run.contrast.unmeasured = results.filter((item) => item.status !== 'measured').map(({ region, text, path, status }) => ({ region, text, path, status }))
    run.contrast.items = measured.map(({ rects, ...item }) => item)
    run.contrast.failing = measured.filter((item) => item.ratio < item.required)
    for (const region of ['bar', 'header', 'hero', 'footer']) {
      const inRegion = measured.filter((item) => item.region === region)
      const failing = inRegion.filter((item) => item.ratio < item.required)
      check(`contrast-${region}`, failing.length === 0, `${failing.length} of ${inRegion.length} measured text runs below WCAG AA`, failing.length ? failing : undefined)
    }
  } catch (error) {
    check('run-completes', false, error.message.split('\n')[0])
  }
  const shellErrors = errors.filter((e) => /\/shell\/v1|ecosystem-bar\.js/.test(`${e.url} ${e.text}`))
  const pageErrors = errors.filter((e) => !shellErrors.includes(e))
  check('shell-console-errors', shellErrors.length === 0, shellErrors.map((e) => e.text.slice(0, 160)).join(' | ') || 'none')
  check('console-errors', pageErrors.length === 0, pageErrors.map((e) => `${e.text.slice(0, 160)}${e.url ? ` (${e.url.split('\n')[0].slice(0, 100)})` : ''}`).join(' | ') || 'none')
  run.checks = applyScope(run.checks, args.scope)
  await context.close()
  return run
}

const browser = await chromium.launch()
const queue = [...jobs]
const runs = []
const worker = async () => {
  const helper = await browser.newPage()
  await helper.addScriptTag({
    content: `${measureTextContrast.toString()}
window.__akMeasure = async (a, b, c, items, scale) => {
  const decode = async (b64) => {
    const blob = await (await fetch('data:image/png;base64,' + b64)).blob()
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
    const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d', { colorSpace: 'srgb' })
    ctx.drawImage(bitmap, 0, 0)
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  }
  const [n, h, r] = await Promise.all([decode(a), decode(b), decode(c)])
  return measureTextContrast(n.data, h.data, r.data, n.width, n.height, items, scale)
}`,
  })
  for (let job = queue.shift(); job; job = queue.shift()) {
    const run = await runJob(browser, helper, job)
    runs.push(run)
    const failed = run.checks.filter((c) => !c.ok).map((c) => c.id)
    console.log(`${failed.length ? 'FAIL' : 'ok  '} ${run.site} ${run.page} ${run.theme} ${run.viewport} · ${run.contrast.measured} text runs measured${failed.length ? ` · ${failed.join(', ')}` : ''}`)
  }
}
await Promise.all(Array.from({ length: Math.max(1, Number(args.concurrency)) }, worker))
await browser.close()

const order = (run) => jobs.findIndex((j) => j.site.id === run.site && j.page === run.page && j.theme === run.theme && j.viewport.id === run.viewport)
runs.sort((a, b) => order(a) - order(b))
const mode = args['shell-origin'] ? `shell override from ${args['shell-origin']}` : 'production'
const summary = formatSummary(runs, { scope: args.scope, mode })
writeFileSync(join(args.out, 'results.json'), JSON.stringify({ mode, scope: args.scope, runs }, null, 2))
writeFileSync(join(args.out, 'summary.md'), summary)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
const failing = runs.filter((run) => run.checks.some((c) => !c.ok))
console.log(`\n${runs.length - failing.length}/${runs.length} runs passed · summary: ${join(args.out, 'summary.md')}`)
process.exit(failing.length ? 1 : 0)
