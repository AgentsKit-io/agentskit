import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FRAMEWORKS } from '@/app/(home)/_components/hero-motion'
import { BrandIcon } from '@/components/home/brand-icon'
import { WorksWithSection } from '@/components/home/showcases'
import brandLogos from '@/lib/brand-logos.json'
import { MARQUEE_SLUGS } from '@/lib/brand-slugs'
import { REPO_ROOT } from '../../../scripts/compute-stats.mjs'
import { diffLogos, planLogos, simpleIconsBySlug } from '../../../scripts/gen-brand-logos.mjs'

const publicDir = join(REPO_ROOT, 'apps/docs-next/public')
const imgSources = (html: string) => [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1])

describe('self-hosted brand logos', () => {
  it('keeps public/logos in sync with lib/brand-logos.json (run node scripts/gen-brand-logos.mjs)', () => {
    const diff = diffLogos(planLogos(brandLogos, simpleIconsBySlug()), join(publicDir, 'logos'))
    expect(diff).toEqual({ missing: [], stale: [], extra: [] })
  })

  it('has a logo for every marquee and hero brand', () => {
    const slugs = new Set(brandLogos.slugs)
    for (const slug of [...MARQUEE_SLUGS, ...FRAMEWORKS.map((framework) => framework.slug)]) expect(slugs, slug).toContain(slug)
  })

  it('renders the logo marquees from same-origin files only, lazily', () => {
    const html = renderToStaticMarkup(<WorksWithSection />)
    const sources = imgSources(html)
    expect(sources.length).toBeGreaterThan(20)
    expect(html).not.toContain('simpleicons.org')
    for (const src of sources) {
      expect(src).toMatch(/^\/logos\/[a-z0-9]+(-[0-9a-f]{6})?\.svg$/)
      expect(existsSync(join(publicDir, src)), src).toBe(true)
    }
    expect(html.match(/<img\b/g)?.length).toBe(html.match(/loading="lazy"/g)?.length)
  })

  it('swaps per-theme tints and falls back to a monogram without requesting a logo', () => {
    const github = renderToStaticMarkup(<BrandIcon slug="github" label="GitHub" />)
    expect(imgSources(github)).toEqual(['/logos/github.svg', '/logos/github-ffffff.svg'])
    for (const { slug, label } of FRAMEWORKS) {
      for (const src of imgSources(renderToStaticMarkup(<BrandIcon slug={slug} label={label} />))) {
        expect(existsSync(join(publicDir, src)), src).toBe(true)
      }
    }
    const missing = renderToStaticMarkup(<BrandIcon slug="slack" label="Slack" />)
    expect(imgSources(missing)).toEqual([])
    expect(missing).toContain('>S</span>')
  })
})
