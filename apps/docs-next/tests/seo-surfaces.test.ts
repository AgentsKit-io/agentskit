import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { counts, lists } from '../lib/ecosystem-stats'

vi.mock('@/lib/source', () => ({
  source: { getPages: () => [] },
}))
vi.mock('@/lib/blog', () => ({ slugsOfAll: () => [] }))
vi.mock('@/lib/learn-steps', () => ({ STEPS: [] }))
vi.mock('@/lib/showcase', () => ({ SHOWCASE: [] }))

import sitemap from '../app/sitemap'

describe('SEO discovery surfaces', () => {
  it('publishes the ecosystem hub without synthetic modification dates', () => {
    const entries = sitemap()
    const urls = entries.map((entry) => entry.url)

    expect(urls).toContain('https://www.agentskit.io/ecosystem')
    expect(urls).toContain('https://www.agentskit.io/integrations')
    expect(urls).toContain('https://www.agentskit.io/recipes')
    expect(urls).toContain('https://www.agentskit.io/publications')
    expect(new Set(urls).size).toBe(urls.length)
    expect(entries.every((entry) => entry.lastModified === undefined)).toBe(true)
  })

  it('links the ecosystem hub from the LLM index route', () => {
    const route = readFileSync(resolve(__dirname, '../app/llms.txt/route.ts'), 'utf8')

    expect(route).toContain('/ecosystem): canonical product mesh and package matrix')
    expect(route).toContain('/integrations): verified connectors for TypeScript AI agents')
    expect(route).toContain('/recipes): copy-paste implementation patterns for production agents')
    expect(route).toContain('/publications): first-party releases and engineering deep dives')
    expect(route).toContain('/resources): verified tools, MCP registries')
  })

  it('keeps the canonical integration catalog count aligned with its generated list', () => {
    expect(counts.integrations).toBe(50)
    expect(lists.integrations).toHaveLength(counts.integrations)
    expect(new Set(lists.integrations).size).toBe(lists.integrations.length)
  })

  it('keeps package integration links on the canonical guide instead of the dead package alias', () => {
    const packageJson = readFileSync(resolve(__dirname, '../../../packages/integrations/package.json'), 'utf8')
    const readme = readFileSync(resolve(__dirname, '../../../packages/integrations/README.md'), 'utf8')
    const nextConfig = readFileSync(resolve(__dirname, '../next.config.mjs'), 'utf8')
    const specificRedirect = nextConfig.indexOf("source: '/docs/packages/integrations'")
    const wildcardRedirect = nextConfig.indexOf("source: '/docs/packages/:slug*'")

    expect(packageJson).toContain('https://www.agentskit.io/docs/for-agents/integrations')
    expect(readme).not.toContain('https://www.agentskit.io/docs/packages/integrations')
    expect(readme).toContain('https://www.agentskit.io/docs/for-agents/integrations')
    expect(specificRedirect).toBeGreaterThan(-1)
    expect(specificRedirect).toBeLessThan(wildcardRedirect)
  })

  it('keeps the resources title concise while preserving proof intent', () => {
    const page = readFileSync(resolve(__dirname, '../app/resources/page.tsx'), 'utf8')

    expect(page).toContain("title: 'Resources: proofs, registries, publications'")
    expect('Resources: proofs, registries, publications | AgentsKit.js'.length).toBeLessThanOrEqual(60)
  })

  it('embeds a two-item BreadcrumbList on the canonical hubs', () => {
    const hubs = [
      ['../app/ecosystem/page.tsx', '/ecosystem'],
      ['../app/integrations/page.tsx', '/integrations'],
      ['../app/recipes/page.tsx', '/recipes'],
      ['../app/publications/page.tsx', '/publications'],
      ['../app/resources/page.tsx', '/resources'],
    ] as const

    for (const [relativePath, hubPath] of hubs) {
      const page = readFileSync(resolve(__dirname, relativePath), 'utf8')

      expect(page).toContain('BreadcrumbList')
      expect(page).toContain("canonicalUrl('/')")
      expect(page).toContain(`canonicalUrl('${hubPath}')`)
    }
  })

  it('keeps the HITL agent guide title, description, and canonical deep links', () => {
    const page = readFileSync(resolve(__dirname, '../content/docs/agents/hitl.mdx'), 'utf8')

    expect(page).toContain('title: Human-in-the-loop patterns for AI agents')
    expect(page).toMatch(
      /description: ['"]?Practical approval patterns for TypeScript AI agents: gated tool calls, review queues, approver policies, and safe resume flows\.['"]?/,
    )
    expect(page).toContain('/docs/reference/recipes/hitl-approvals')
    expect(page).toContain('/docs/ui/tool-confirmation')
  })

  it('points the tools guide at the live integration catalog instead of the stale IA rollout note', () => {
    const page = readFileSync(resolve(__dirname, '../content/docs/agents/tools/index.mdx'), 'utf8')

    expect(page).toContain('/integrations')
    expect(page).toContain('/docs/for-agents/integrations')
    expect(page).toContain('50 service descriptors')
    expect(page).not.toContain('land in step 6')
  })

  it('overrides the ArgsValidator API description without changing the generated fallback', () => {
    const page = readFileSync(
      resolve(__dirname, '../content/docs/api/core/type-aliases/ArgsValidator.md'),
      'utf8',
    )
    const script = readFileSync(resolve(__dirname, '../scripts/gen-api.mjs'), 'utf8')
    const description =
      'ArgsValidator contract for validating TypeScript AI agent tool arguments against JSON Schema before execution.'

    expect(page).toContain(`description: ${JSON.stringify(description)}`)
    expect(script).toContain(`pkgName === 'core' && title === 'ArgsValidator'`)
    expect(script).toContain(description)
    expect(script).toContain('Auto-generated API reference for ${title}.')
  })

  it('does not declare a self-redirect for /docs/agents/tools and filters source === destination', () => {
    const nextConfig = readFileSync(resolve(__dirname, '../next.config.mjs'), 'utf8')

    expect(nextConfig).not.toContain(
      "{ source: '/docs/agents/tools', destination: '/docs/agents/tools'",
    )
    expect(nextConfig).toContain('r.source !== r.destination')
  })

  it('documents grokEmbedder with an explicit required model', () => {
    const page = readFileSync(
      resolve(__dirname, '../content/docs/data/providers/grok-embedder.mdx'),
      'utf8',
    )

    expect(page).toContain("model: 'grok-embed-model'")
    expect(page.replaceAll('`', '')).toContain('| model | string | required |')
    expect(page).toContain(
      'description: xAI embedding models through the OpenAI-compatible embeddings API.',
    )
    expect(page).not.toContain('provider default')
  })

  it('documents createHybridRetriever with the real Retriever-first signature', () => {
    const page = readFileSync(resolve(__dirname, '../content/docs/data/rag/hybrid.mdx'), 'utf8')
    const snippet = page.match(/```ts\n([\s\S]*?)```/)?.[1] ?? ''

    expect(page).toContain('createHybridRetriever(baseRetriever')
    expect(page).toContain('vectorWeight')
    expect(page).toContain('bm25Weight')
    expect(snippet).not.toContain('lexical')
    expect(snippet).not.toContain('weights:')
    expect(snippet).not.toContain('vector: rag')
  })

  it('replaces stale IA rollout notes with live section links', () => {
    const pages = [
      [
        '../content/docs/agents/skills/index.mdx',
        ['/docs/reference/recipes/skill-marketplace'],
      ],
      [
        '../content/docs/data/memory/index.mdx',
        ['/docs/reference/recipes/vector-adapters'],
      ],
      ['../content/docs/data/providers/index.mdx', ['./choosing']],
      [
        '../content/docs/data/rag/index.mdx',
        ['/docs/reference/recipes/doc-loaders', '/docs/reference/recipes/rag-reranking'],
      ],
      ['../content/docs/production/cli/index.mdx', ['./ai', './dev']],
      [
        '../content/docs/reference/specs/index.mdx',
        ['./a2a', './manifest', './eval-format'],
      ],
      [
        '../content/docs/reference/contribute/rfc-process.mdx',
        ['https://github.com/AgentsKit-io/agentskit/tree/main/docs/architecture/adrs'],
      ],
    ] as const

    for (const [relativePath, links] of pages) {
      const page = readFileSync(resolve(__dirname, relativePath), 'utf8')

      expect(page).not.toContain('land in step')
      expect(page).not.toContain('Coming soon')
      expect(page).not.toContain('docs IA rollout')

      for (const link of links) {
        expect(page).toContain(link)
      }
    }
  })
})
