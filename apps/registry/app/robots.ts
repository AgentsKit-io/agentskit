import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/'] },
      { userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot'], allow: '/' },
    ],
    sitemap: 'https://registry.agentskit.io/sitemap.xml',
    host: 'https://registry.agentskit.io',
  }
}
