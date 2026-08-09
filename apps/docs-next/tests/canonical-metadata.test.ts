import { describe, expect, it } from 'vitest'
import { STEPS } from '../lib/learn-steps'
import { SHOWCASE } from '../lib/showcase'
import { canonicalUrl } from '../lib/canonical-url'

describe('canonical metadata', () => {
  it('builds a self-referencing canonical for every affected route', () => {
    const routes = [
      '/learn',
      '/showcase',
      '/stack',
      '/community',
      '/evals',
      '/ecosystem',
      ...STEPS.map((step) => `/learn/${step.slug}`),
      ...SHOWCASE.map((entry) => `/showcase/${entry.slug}`),
    ]

    expect(routes).toHaveLength(32)
    expect(new Set(routes).size).toBe(routes.length)

    for (const route of routes) {
      expect(canonicalUrl(route)).toBe(`https://www.agentskit.io${route}`)
    }
  })

  it('keeps the homepage canonical at the site root', () => {
    expect(canonicalUrl('/')).toBe('https://www.agentskit.io')
  })
})
