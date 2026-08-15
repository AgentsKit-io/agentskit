import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://www.agentskit.io/', changeFrequency: 'weekly', priority: 1 },
  ]
}
