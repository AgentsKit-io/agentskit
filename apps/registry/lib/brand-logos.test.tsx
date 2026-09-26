import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BrandIcon } from '@/app/(home)/_components/brand-icon'
import { WorksWith } from '@/app/(home)/_components/works-with'
import { diffLogos, planLogos, simpleIconsBySlug } from '../../../scripts/gen-brand-logos.mjs'
import brandLogos from './brand-logos.json'

const publicDir = fileURLToPath(new URL('../public', import.meta.url))
const imgSources = (html: string) => [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1])

describe('self-hosted brand logos', () => {
  it('keeps public/logos in sync with lib/brand-logos.json (run node scripts/gen-brand-logos.mjs)', () => {
    const diff = diffLogos(planLogos(brandLogos, simpleIconsBySlug()), join(publicDir, 'logos'))
    expect(diff).toEqual({ missing: [], stale: [], extra: [] })
  })

  it('renders the works-with marquee from same-origin files only, lazily', () => {
    const html = renderToStaticMarkup(<WorksWith />)
    const sources = imgSources(html)
    expect(sources.length).toBeGreaterThan(20)
    expect(html).not.toContain('simpleicons.org')
    for (const src of sources) {
      expect(src).toMatch(/^\/logos\/[a-z0-9]+(-[0-9a-f]{6})?\.svg$/)
      expect(existsSync(join(publicDir, src)), src).toBe(true)
    }
    expect(html.match(/<img\b/g)?.length).toBe(html.match(/loading="lazy"/g)?.length)
  })

  it('swaps per-theme tints and renders brands Simple Icons lacks as a monogram', () => {
    expect(imgSources(renderToStaticMarkup(<BrandIcon slug="github" label="GitHub" />))).toEqual(['/logos/github.svg', '/logos/github-ffffff.svg'])
    const openai = renderToStaticMarkup(<BrandIcon slug="openai" label="OpenAI" />)
    expect(imgSources(openai)).toEqual([])
    expect(openai).toContain('>O</span>')
  })
})
