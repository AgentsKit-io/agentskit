import type { MetadataRoute } from 'next'
import { source } from '@/lib/source'
import { getRegistryIndex } from '@/lib/registry'
import { categoryIds, categoryUrl } from '@/lib/categories'

const SITE = 'https://registry.agentskit.io'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agents = await getRegistryIndex()
  return [
    { url: SITE, changeFrequency: 'daily', priority: 1 },
    ...source.getPages().map((page) => ({
      url: `${SITE}${page.url}`,
      changeFrequency: 'monthly' as const,
      priority: page.slugs.length === 0 ? 0.9 : 0.7,
    })),
    ...categoryIds(agents).map((category) => ({
      url: categoryUrl(category),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
    ...agents.map((agent) => ({
      url: `${SITE}/agents/${agent.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
