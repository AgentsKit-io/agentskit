/**
 * Pure building blocks for the ecosystem visual/UX regression check
 * (`scripts/verify-ecosystem-visual.mjs`): the site matrix derived from
 * ecosystem.json, WCAG contrast math, the rendered-pixel text contrast
 * measurement, and the Markdown summary.
 *
 * `measureTextContrast` is injected verbatim into a browser page (via
 * Function#toString) to analyse decoded screenshots, so it must stay
 * self-contained: no imports, no closures.
 */

export const THEMES = ['light', 'dark']

export const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 960 },
  { id: 'mobile', width: 390, height: 844 },
]

export const PAGES = ['home', 'docs']

/** Regions whose visible text must meet WCAG AA. */
export const CONTRAST_REGIONS = ['bar', 'header', 'hero', 'tour', 'footer']

/** Checks the shared shell owns: a shell PR fails only on these (see `--scope shell`). */
export const SHELL_CHECKS = new Set(['bar-present', 'bar-products', 'bar-current', 'bar-star', 'footer-upgraded', 'no-horizontal-overflow', 'shell-console-errors', 'contrast-bar', 'contrast-tour', 'contrast-footer'])

/**
 * Every public site in the ecosystem (bar products plus Playbook, which loads the
 * shell without being listed), with the bar the shell must render on it.
 */
export function ecosystemSites(ecosystem) {
  const barProducts = ecosystem.products
    .filter((product) => product.navigation.showInBar)
    .sort((a, b) => a.navigation.order - b.navigation.order)
  const expectedBar = barProducts.map((product) => ({ label: product.shortName, url: product.surfaces.home }))
  return [...ecosystem.products]
    .sort((a, b) => a.navigation.order - b.navigation.order)
    .map((product) => {
      const home = product.surfaces.home
      const docs = product.surfaces.docs && product.surfaces.docs !== home
        ? product.surfaces.docs
        : new URL('/docs', home).toString()
      return {
        id: product.id,
        name: product.shortName,
        repo: product.repo,
        inBar: product.navigation.showInBar,
        pages: { home, docs },
        expectedBar,
        expectedCurrent: product.navigation.showInBar ? product.shortName : null,
        expectedStar: `https://github.com/${product.repo}`,
      }
    })
}

/**
 * Parses repeatable `--site-origin <product-id>=<url>` values into a Map, so any product repo
 * can point the check at its local build. Throws on unknown ids or malformed URLs.
 */
export function parseSiteOrigins(values, knownIds) {
  const origins = new Map()
  for (const value of values ?? []) {
    const separator = value.indexOf('=')
    const id = separator > 0 ? value.slice(0, separator).trim() : ''
    const url = separator > 0 ? value.slice(separator + 1).trim() : ''
    if (!knownIds.includes(id)) throw new Error(`--site-origin: unknown site "${id || value}" (known: ${knownIds.join(', ')})`)
    if (!URL.canParse(url) || !/^https?:$/.test(new URL(url).protocol)) throw new Error(`--site-origin: "${url}" is not an http(s) URL for ${id}`)
    origins.set(id, new URL(url).origin)
  }
  return origins
}

/** Serves a site's home and docs paths from another origin (a local build). */
export function rebaseSite(site, origin) {
  const rebase = (url) => {
    const parsed = new URL(url)
    return new URL(parsed.pathname + parsed.search, origin).toString()
  }
  return { ...site, pages: { home: rebase(site.pages.home), docs: rebase(site.pages.docs) } }
}

export function relativeLuminance(r, g, b) {
  const channel = (value) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground[0], foreground[1], foreground[2])
  const b = relativeLuminance(background[0], background[1], background[2])
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** WCAG 2.x AA: 3:1 for large text (>= 24px, or >= 18.66px bold), 4.5:1 otherwise. */
export function requiredContrast(fontSizePx, fontWeight) {
  const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && Number(fontWeight) >= 700)
  return large ? 3 : 4.5
}

/**
 * Measures the contrast of rendered text from three same-size RGBA screenshots:
 * `normal` (page as rendered), `hidden` (same frame with every glyph made
 * transparent, i.e. the true local background), and `repeat` (normal again, to
 * detect animated regions). Glyph pixels are where `normal` differs from
 * `hidden`; the most-covered ones (largest difference) carry the real text
 * colour, and each is compared with the background pixel at the same position,
 * so gradients, images, and translucent panels are measured as painted.
 *
 * items: [{ rects: [{ x, y, width, height }] }] in CSS pixels; scale = device pixel ratio.
 * Returns one result per item: { status: 'measured' | 'unstable', ratio, fg, bg }.
 */
export function measureTextContrast(normal, hidden, repeat, width, height, items, scale) {
  const lum = (r, g, b) => {
    const f = (v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratioAt = (i) => {
    const a = lum(normal[i], normal[i + 1], normal[i + 2])
    const b = lum(hidden[i], hidden[i + 1], hidden[i + 2])
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }
  const diff = (x, y, i) => Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2]))
  const hex = (source, i) => '#' + [source[i], source[i + 1], source[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')
  return items.map((item) => {
    const glyph = []
    let total = 0
    let unstable = 0
    for (const rect of item.rects) {
      const x0 = Math.max(0, Math.floor(rect.x * scale))
      const y0 = Math.max(0, Math.floor(rect.y * scale))
      const x1 = Math.min(width, Math.ceil((rect.x + rect.width) * scale))
      const y1 = Math.min(height, Math.ceil((rect.y + rect.height) * scale))
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4
          total++
          if (diff(normal, repeat, i) > 24) unstable++
          const d = diff(normal, hidden, i)
          if (d > 12) glyph.push([d, i])
        }
      }
    }
    if (total === 0 || unstable / total > 0.02) return { status: 'unstable', ratio: null, fg: null, bg: null }
    // Painted text that barely differs from its background is the worst case, not a skip.
    if (glyph.length < 3) return { status: 'measured', ratio: 1, fg: 'indistinguishable', bg: 'background' }
    glyph.sort((a, b) => b[0] - a[0])
    const core = glyph.slice(0, Math.max(3, Math.ceil(glyph.length * 0.15)))
    const ratios = core.map(([, i]) => ratioAt(i)).sort((a, b) => a - b)
    const ratio = ratios[Math.floor(ratios.length / 2)]
    const sample = core[0][1]
    return { status: 'measured', ratio: Math.round(ratio * 100) / 100, fg: hex(normal, sample), bg: hex(hidden, sample) }
  })
}

/**
 * True when a failing text run was painted over by something else (a fade mask, a sticky
 * panel, a pointer-events:none overlay): the measured glyph colour is far from the colour
 * the element would paint — its CSS colour at its effective opacity over the measured
 * background — and that expected colour would pass. Used only to exempt, never to pass text.
 */
export function isOccluded(item) {
  const css = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(item.css ?? '')
  const hexColor = /^#[0-9a-f]{6}$/
  if (!css || !hexColor.test(item.fg ?? '') || !hexColor.test(item.bg ?? '')) return false
  const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
  const fg = rgb(item.fg)
  const bg = rgb(item.bg)
  const alpha = (css[4] === undefined ? 1 : Number(css[4])) * (item.opacity ?? 1)
  const expected = [1, 2, 3].map((group, i) => Number(css[group]) * alpha + bg[i] * (1 - alpha))
  const distance = Math.max(...expected.map((value, i) => Math.abs(value - fg[i])))
  return distance > 64 && contrastRatio(expected, bg) >= item.required
}

/** Re-labels non-shell failures as warnings when only the shell is under test. */
export function applyScope(checks, scope) {
  if (scope !== 'shell') return checks
  return checks.map((check) => (check.ok || SHELL_CHECKS.has(check.id) ? check : { ...check, ok: true, warning: true }))
}

// Backslashes first, so an escape added for a pipe can never be re-read as an escaped backslash.
const escapeCell = (value) => String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ')

/** Readable Markdown for the job summary: a run matrix, then every failure with its evidence. */
export function formatSummary(runs, { scope, mode }) {
  const failing = runs.filter((run) => run.checks.some((check) => !check.ok))
  const lines = [
    '# Ecosystem visual/UX regression',
    '',
    `Mode: **${mode}** · scope: **${scope}** · ${runs.length} runs · ${failing.length} failing`,
    '',
    '| Site | Page | Theme | Viewport | Resolved theme | Contrast (measured / failing) | Result |',
    '|---|---|---|---|---|---|---|',
  ]
  for (const run of runs) {
    const failed = run.checks.filter((check) => !check.ok)
    const warned = run.checks.filter((check) => check.warning)
    let result = 'pass'
    if (failed.length) result = `FAIL (${failed.map((check) => check.id).join(', ')})`
    else if (warned.length) result = `pass, ${warned.length} warning(s)`
    lines.push(`| ${run.site} | ${run.page} | ${run.theme} | ${run.viewport} | ${run.resolvedTheme ?? '?'} | ${run.contrast.measured} / ${run.contrast.failing.length} | ${result} |`)
  }
  const sections = [['Failures', (check) => !check.ok], ['Warnings (outside the shell scope)', (check) => check.warning]]
  for (const [title, pick] of sections) {
    const entries = runs.flatMap((run) => run.checks.filter(pick).map((check) => ({ run, check })))
    if (!entries.length) continue
    lines.push('', `## ${title}`, '')
    for (const { run, check } of entries) {
      lines.push(`- **${run.site} · ${run.page} · ${run.theme} · ${run.viewport}** — \`${check.id}\`: ${escapeCell(check.detail)}`)
      for (const item of check.items ?? []) {
        lines.push(`  - ${item.region} \`${escapeCell(item.path)}\` "${escapeCell(item.text)}" — ${item.ratio}:1 (needs ${item.required}:1; text ${item.fg} on ${item.bg}; ${item.fontSize}px/${item.fontWeight})`)
      }
    }
  }
  return lines.join('\n') + '\n'
}
