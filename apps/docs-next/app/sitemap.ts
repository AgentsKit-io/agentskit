import type { MetadataRoute } from 'next'
import { source } from '@/lib/source'
import { slugsOfAll } from '@/lib/blog'
import { STEPS } from '@/lib/learn-steps'
import { SHOWCASE } from '@/lib/showcase'

const SITE = 'https://www.agentskit.io'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE}/docs`, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${SITE}/docs/get-started`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/docs/use-cases`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/docs/compare`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/docs/for-agents`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/docs/ui`, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/docs/agents`, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/docs/data`, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/docs/production`, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/docs/reference`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/docs/reference/examples`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/docs/reference/contribute`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/learn`, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/ecosystem`, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/integrations`, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/recipes`, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/publications`, changeFrequency: 'weekly', priority: 0.75 },
    { url: `${SITE}/resources`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/showcase`, changeFrequency: 'weekly', priority: 0.75 },
    { url: `${SITE}/stack`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/community`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/evals`, changeFrequency: 'monthly', priority: 0.6 },
  ]

  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...slugsOfAll().map((slug) => ({
      url: `${SITE}/blog/${slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...STEPS.map((s) => ({
      url: `${SITE}/learn/${s.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...SHOWCASE.map((s) => ({
      url: `${SITE}/showcase/${s.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]

  const docPages: MetadataRoute.Sitemap = source.getPages().map((page) => {
    const slug = page.slugs.join('/')
    const url = slug ? `${SITE}/docs/${slug}` : `${SITE}/docs`
    return {
      url,
      changeFrequency: 'weekly',
      priority: priorityFor(slug),
    }
  })

  const seen = new Set<string>()
  return [...staticRoutes, ...docPages, ...dynamicRoutes].filter((r) => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })
}

function priorityFor(slug: string): number {
  if (!slug) return 0.95
  if (slug.startsWith('for-agents')) return 0.9
  if (slug.startsWith('get-started')) return 0.9
  if (slug.startsWith('use-cases')) return 0.85
  if (slug.startsWith('compare')) return 0.9
  if (
    slug.startsWith('ui') ||
    slug.startsWith('agents') ||
    slug.startsWith('data') ||
    slug.startsWith('production')
  ) return 0.8
  if (slug.startsWith('reference/packages')) return 0.8
  if (slug.startsWith('reference/examples') || slug.startsWith('reference/recipes')) return 0.7
  if (slug.startsWith('reference/contribute')) return 0.6
  return 0.6
}
