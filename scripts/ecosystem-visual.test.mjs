import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  applyScope, contrastRatio, ecosystemSites, formatSummary, isOccluded, measureTextContrast, rebaseSite, requiredContrast,
} from './lib/ecosystem-visual.mjs'

const ecosystem = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'ecosystem.json'), 'utf8'))

/** A width×height RGBA image filled with `color`, with `paint` pixels overridden. */
function image(width, height, color, paint = []) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) data.set([...color, 255], i * 4)
  for (const [x, y, c] of paint) data.set([...c, 255], (y * width + x) * 4)
  return data
}

const glyph = (color) => Array.from({ length: 12 }, (_, i) => [2 + (i % 6), 2 + Math.floor(i / 6), color])
const item = { rects: [{ x: 0, y: 0, width: 10, height: 10 }] }

describe('ecosystem sites', () => {
  const sites = ecosystemSites(ecosystem)

  it('covers every public site, with the six bar products in the fixed order', () => {
    expect(sites.map((site) => site.id)).toEqual(['agentskit', 'registry', 'agentskit-chat', 'doc-bridge', 'code-review', 'harness', 'playbook'])
    expect(sites[0].expectedBar.map((product) => product.label)).toEqual(['AgentsKit', 'Registry', 'Chat', 'Doc Bridge', 'Code Review', 'Harness'])
  })

  it('keeps Playbook out of the bar while it still stars its own repository', () => {
    const playbook = sites.find((site) => site.id === 'playbook')
    expect(playbook.expectedCurrent).toBeNull()
    expect(playbook.expectedStar).toBe('https://github.com/AgentsKit-io/agents-playbook')
  })

  it('always resolves a docs page distinct from the home page', () => {
    for (const site of sites) expect(site.pages.docs).not.toBe(site.pages.home)
  })

  it('rebases a site onto a local origin', () => {
    const local = rebaseSite(sites[0], 'http://localhost:3000')
    expect(local.pages).toEqual({ home: 'http://localhost:3000/', docs: 'http://localhost:3000/docs' })
  })
})

describe('WCAG contrast', () => {
  it('computes the reference ratios', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(contrastRatio([0x77, 0x77, 0x77], [255, 255, 255])).toBeCloseTo(4.48, 2)
  })

  it('relaxes the threshold for large and bold-large text only', () => {
    expect(requiredContrast(16, '400')).toBe(4.5)
    expect(requiredContrast(24, '400')).toBe(3)
    expect(requiredContrast(19, '700')).toBe(3)
    expect(requiredContrast(19, '600')).toBe(4.5)
  })
})

describe('measureTextContrast', () => {
  const background = image(10, 10, [255, 255, 255])

  it('measures painted glyphs against the background under them', () => {
    const normal = image(10, 10, [255, 255, 255], glyph([0x77, 0x77, 0x77]))
    const [result] = measureTextContrast(normal, background, normal, 10, 10, [item], 1)
    expect(result).toMatchObject({ status: 'measured', ratio: 4.48, fg: '#777777', bg: '#ffffff' })
  })

  it('uses the local background, so light text on a light panel fails even on a dark page', () => {
    const panel = image(10, 10, [0xf9, 0xe9, 0xcf])
    const normal = image(10, 10, [0xf9, 0xe9, 0xcf], glyph([0xe6, 0xed, 0xf3]))
    const [result] = measureTextContrast(normal, panel, normal, 10, 10, [item], 1)
    expect(result.ratio).toBeLessThan(1.2)
  })

  it('reports painted text that cannot be told apart from its background as 1:1', () => {
    const [result] = measureTextContrast(background, background, background, 10, 10, [item], 1)
    expect(result).toMatchObject({ status: 'measured', ratio: 1 })
  })

  it('skips regions that changed between two identical renders (animations)', () => {
    const normal = image(10, 10, [255, 255, 255], glyph([0, 0, 0]))
    const moved = image(10, 10, [255, 255, 255], glyph([0, 0, 0]).map(([x, y, c]) => [x + 2, y + 5, c]))
    const [result] = measureTextContrast(normal, background, moved, 10, 10, [item], 1)
    expect(result.status).toBe('unstable')
  })

  it('scales CSS rectangles to device pixels', () => {
    const normal = image(20, 20, [255, 255, 255], [[12, 12, [0, 0, 0]], [13, 12, [0, 0, 0]], [12, 13, [0, 0, 0]]])
    const [result] = measureTextContrast(normal, image(20, 20, [255, 255, 255]), normal, 20, 20, [{ rects: [{ x: 5, y: 5, width: 5, height: 5 }] }], 2)
    expect(result.ratio).toBe(21)
  })
})

describe('isOccluded', () => {
  const base = { required: 4.5, bg: '#14202e', opacity: 1 }

  it('exempts text another layer painted over when its own colour would pass', () => {
    expect(isOccluded({ ...base, css: 'rgb(139, 148, 158)', fg: '#0d1117' })).toBe(true)
  })

  it('never exempts text that is painted in its own failing colour', () => {
    expect(isOccluded({ ...base, bg: '#f9e9cf', css: 'rgb(230, 237, 243)', fg: '#e6edf3' })).toBe(false)
  })

  it('accounts for opacity, so faded text still fails', () => {
    expect(isOccluded({ ...base, bg: '#ffffff', css: 'rgb(0, 0, 0)', opacity: 0.3, fg: '#b3b3b3' })).toBe(false)
  })

  it('does not guess when the glyphs were indistinguishable', () => {
    expect(isOccluded({ ...base, css: 'rgb(139, 148, 158)', fg: 'indistinguishable', bg: 'background' })).toBe(false)
  })
})

describe('reporting', () => {
  const checks = [
    { id: 'bar-star', ok: false, detail: 'Star → x' },
    { id: 'contrast-hero', ok: false, detail: '1 of 3', items: [{ region: 'hero', path: 'h1', text: 'Hi', ratio: 1.03, required: 3, fg: '#e6edf3', bg: '#f9e9cf', fontSize: 60, fontWeight: '700' }] },
  ]

  it('keeps shell failures and demotes product-owned ones in shell scope', () => {
    const scoped = applyScope(checks, 'shell')
    expect(scoped[0].ok).toBe(false)
    expect(scoped[1]).toMatchObject({ ok: true, warning: true })
    expect(applyScope(checks, 'all')).toBe(checks)
  })

  it('prints every failing text run with site, theme, viewport, element, and measured contrast', () => {
    const summary = formatSummary([{ site: 'agentskit-chat', page: 'home', theme: 'light', viewport: 'desktop', resolvedTheme: 'light', contrast: { measured: 3, failing: [{}] }, checks }], { scope: 'all', mode: 'production' })
    expect(summary).toContain('**agentskit-chat · home · light · desktop** — `contrast-hero`')
    expect(summary).toContain('hero `h1` "Hi" — 1.03:1 (needs 3:1; text #e6edf3 on #f9e9cf; 60px/700)')
    expect(summary).toContain('FAIL (bar-star, contrast-hero)')
  })
})
