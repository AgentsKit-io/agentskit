import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: redirectMock }))

vi.mock('@/lib/source', () => ({
  source: {
    getPages: () => [
      {
        url: '/docs',
        slugs: [],
        data: { title: 'Registry docs', description: 'Registry documentation.', structuredData: 'Registry docs.' },
      },
      {
        url: '/docs/for-agents',
        slugs: ['for-agents'],
        data: { title: 'For agents', description: 'Deterministic agent entry points.', structuredData: 'Agent guide.' },
      },
    ],
  },
}))

vi.mock('@/lib/registry', () => ({
  getRegistryIndex: () => Promise.resolve([
    { id: 'reviewer', title: 'Reviewer', description: 'Reviews changes.', category: 'coding' },
  ]),
}))

vi.mock('@/lib/docs-text', () => ({
  resolveStructuredData: (data: { structuredData?: unknown }) => Promise.resolve(data.structuredData),
  structuredText: (value: unknown) => typeof value === 'string' ? value : '',
}))

vi.mock('@/lib/categories', () => ({
  categoryIds: () => ['coding'],
  categoryUrl: (category: string) => `https://registry.agentskit.io/categories/${category}`,
}))

import ForAgentsPage from '../for-agents/page'
import { GET as getFavicon } from '../favicon.ico/route'
import { GET as getLlmsFull } from '../llms-full.txt/route'
import { GET as getLlmsIndex } from '../llms.txt/route'
import sitemap from '../sitemap'

const SITE = 'https://registry.agentskit.io'

describe('Registry machine documentation contracts', () => {
  afterEach(() => {
    redirectMock.mockClear()
    vi.unstubAllGlobals()
  })

  it('publishes a concise llms.txt with canonical documentation and full-context paths', async () => {
    const response = await getLlmsIndex()
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(body).toContain(`[For agents](${SITE}/docs/for-agents)`)
    expect(body).toContain(`[Full agent context](${SITE}/llms-full.txt)`)
    expect(body).toContain(`[Registry index](${SITE}/r/index.json)`)
    expect(body.match(/^## AgentsKit ecosystem$/gm)).toHaveLength(1)

    const expectedProducts = [
      ['AgentsKit', 'https://www.agentskit.io/docs', 'https://www.agentskit.io/llms.txt'],
      ['AgentsKit Registry', `${SITE}/docs`, `${SITE}/llms.txt`],
      ['AgentsKit Chat', 'https://chat.agentskit.io/docs', 'https://chat.agentskit.io/llms.txt'],
      ['Agents Playbook', 'https://playbook.agentskit.io/docs', 'https://playbook.agentskit.io/llms.txt'],
      ['Doc Bridge', 'https://agentskit-io.github.io/doc-bridge/', 'https://agentskit-io.github.io/doc-bridge/llms.txt'],
      ['AgentsKit Code Review', 'https://github.com/AgentsKit-io/code-review-cli#readme', 'https://raw.githubusercontent.com/AgentsKit-io/code-review-cli/main/llms.txt'],
      ['AgentsKit OS', 'https://akos.agentskit.io/docs', 'https://akos.agentskit.io/llms.txt'],
    ] as const

    let previous = -1
    for (const [name, docs, llms] of expectedProducts) {
      const position = body.indexOf(`[${name}](${docs})`)
      expect(position).toBeGreaterThan(previous)
      expect(body).toContain(`Machine index: ${llms}`)
      previous = position
    }
    expect(body).toContain(`[AgentsKit Registry](${SITE}/docs) **(current)**`)
  })

  it('publishes llms-full.txt as plain text with docs before the catalog', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response('## Reviewer\n\nCatalog context.'),
    ))

    const response = await getLlmsFull()
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(body).toContain(`URL: ${SITE}/docs/for-agents`)
    expect(body.indexOf('# AgentsKit Registry documentation')).toBeLessThan(body.indexOf('# Agent catalog'))
    expect(body).toContain('Catalog context.')
  })

  it('keeps /for-agents as an alias of the canonical guide', () => {
    ForAgentsPage()

    expect(redirectMock).toHaveBeenCalledOnce()
    expect(redirectMock).toHaveBeenCalledWith('/docs/for-agents')
  })

  it('indexes /agents and the canonical agent guide without indexing its redirect alias', async () => {
    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls).toContain(`${SITE}/agents`)
    expect(urls).toContain(`${SITE}/docs/for-agents`)
    expect(urls).not.toContain(`${SITE}/for-agents`)
  })

  it('ships a discoverable SVG app icon suitable for favicon generation', async () => {
    const icon = await readFile(new URL('../icon.svg', import.meta.url), 'utf8')

    expect(icon).toContain('<svg')
    expect(icon).toContain('viewBox="0 0 64 64"')
    expect(icon).toContain('#58A6FF')
  })

  it('serves the conventional favicon path from the canonical Registry icon', () => {
    const response = getFavicon(new Request(`${SITE}/favicon.ico`))

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(`${SITE}/icon.svg`)
  })
})
