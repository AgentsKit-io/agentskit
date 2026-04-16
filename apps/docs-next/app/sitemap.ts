import type { MetadataRoute } from 'next'
import { source } from '@/lib/source'

const SITE = 'https://www.agentskit.io'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/docs/contribute`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/docs/examples`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ]

  const docPages: MetadataRoute.Sitemap = source.getPages().map(page => {
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
  return [...staticRoutes, ...docPages].filter(r => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })
}

function priorityFor(slug: string): number {
  if (!slug) return 0.9
  if (slug.startsWith('getting-started')) return 0.9
  if (slug.startsWith('examples')) return 0.8
  if (slug.startsWith('recipes')) return 0.7
  if (slug.startsWith('contribute')) return 0.7
  if (slug.startsWith('packages') || slug.startsWith('adapters')) return 0.7
  return 0.6
}
