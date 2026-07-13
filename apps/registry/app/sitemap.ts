import type { MetadataRoute } from 'next'
import { source } from '@/lib/source'
import { getRegistryIndex } from '@/lib/registry'

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
    ...agents.map((agent) => ({
      url: `${SITE}/agents/${agent.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
