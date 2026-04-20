import type { MetadataRoute } from 'next'
import { source } from '@/lib/source'

const SITE = 'https://www.agentskit.io'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${SITE}/docs/get-started`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/docs/for-agents`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/docs/ui`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/docs/agents`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/docs/data`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/docs/production`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/docs/reference`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/docs/reference/examples`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/docs/reference/contribute`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ]

  const docPages: MetadataRoute.Sitemap = source.getPages().map((page) => {
    const slug = page.slugs.join('/')
    const url = slug ? `${SITE}/docs/${slug}` : `${SITE}/docs`
    return {
      url,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: priorityFor(slug),
    }
  })

  const seen = new Set<string>()
  return [...staticRoutes, ...docPages].filter((r) => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })
}

function priorityFor(slug: string): number {
  if (!slug) return 0.95
  if (slug.startsWith('for-agents')) return 0.9
  if (slug.startsWith('get-started')) return 0.9
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
