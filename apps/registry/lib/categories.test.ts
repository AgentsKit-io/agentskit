import { describe, expect, it } from 'vitest'
import type { RegistryAgentSummary } from './registry'
import {
  agentsInCategory,
  categoryIds,
  categoryJsonLd,
  categoryMetadata,
  categoryUrl,
} from './categories'

const agents: RegistryAgentSummary[] = [
  {
    id: 'ops-zeta',
    title: 'Zeta Agent',
    description: 'Handles operations.',
    category: 'ops',
    packages: ['@agentskit/core'],
  },
  {
    id: 'coding-alpha',
    title: 'Alpha Agent',
    description: 'Reviews code.',
    category: 'coding',
    packages: ['@agentskit/core'],
    runnable: true,
    validation: { status: 'approved', score: 98, confidence: 0.99 },
  },
  {
    id: 'coding-beta',
    title: 'Beta Agent',
    description: 'Tests code.',
    category: 'coding',
    packages: ['@agentskit/core'],
  },
]

describe('category helpers', () => {
  it('returns each real category once in registry order', () => {
    expect(categoryIds([...agents, agents[1]])).toEqual(['coding', 'ops'])
  })

  it('filters one category and sorts all matching agents by title', () => {
    expect(agentsInCategory(agents, 'coding').map((agent) => agent.id))
      .toEqual(['coding-alpha', 'coding-beta'])
    expect(agentsInCategory(agents, 'missing')).toEqual([])
  })

  it('builds canonical metadata only for a real category', () => {
    const metadata = categoryMetadata('coding', agents)
    expect(metadata).toMatchObject({
      title: 'Coding AI agents',
      alternates: { canonical: 'https://registry.agentskit.io/categories/coding' },
      openGraph: { url: 'https://registry.agentskit.io/categories/coding', type: 'website' },
    })
    expect(categoryMetadata('missing', agents)).toBeNull()
  })

  it('builds a CollectionPage ItemList with canonical agent URLs', () => {
    const matching = agentsInCategory(agents, 'coding')
    expect(categoryJsonLd('coding', matching)).toMatchObject({
      '@type': 'CollectionPage',
      url: categoryUrl('coding'),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: 2,
        itemListElement: [
          { position: 1, name: 'Alpha Agent', url: 'https://registry.agentskit.io/agents/coding-alpha' },
          { position: 2, name: 'Beta Agent', url: 'https://registry.agentskit.io/agents/coding-beta' },
        ],
      },
    })
  })
})
