import { describe, expect, it } from 'vitest'
import { collectEcosystemLiveClaims } from '../lib/ecosystem-live-claims'
import { stats } from '../lib/ecosystem-stats'

describe('ecosystem live claims', () => {
  it('derives local and registry values from their canonical application data', async () => {
    const registryAgents = [
      { id: 'one', category: 'research' },
      { id: 'two', category: 'support' },
      { id: 'three', category: 'support' },
      { id: 'four', category: 'coding' },
      { id: 'five', category: 'data' },
      { id: 'six', category: 'marketing' },
      { id: 'seven', category: 'ops' },
    ]
    const fetchImpl = async () => new Response(JSON.stringify({ agents: registryAgents }))
    const claims = await collectEcosystemLiveClaims(fetchImpl as typeof fetch)

    expect(claims.agentskit).toEqual(expect.objectContaining({
      packages: stats.counts.packages,
      'catalog-providers': stats.counts.catalogProviders,
      'native-adapters': stats.counts.nativeAdapters,
      integrations: stats.counts.integrations,
    }))
    expect(claims.registry).toEqual({ agents: 7, 'remaining-categories': 1 })
  })

  it('keeps verified local claims when an external origin is unavailable', async () => {
    const claims = await collectEcosystemLiveClaims(async () => { throw new Error('offline') })
    expect(claims.agentskit?.packages).toBe(stats.counts.packages)
    expect(claims.registry).toBeUndefined()
  })

  it('retries a transient external origin failure once', async () => {
    let attempts = 0
    const claims = await collectEcosystemLiveClaims(async () => {
      attempts += 1
      if (attempts === 1) throw new Error('temporary failure')
      return new Response(JSON.stringify({ agents: [{ category: 'research' }] }))
    })

    expect(attempts).toBe(2)
    expect(claims.registry).toEqual({ agents: 1, 'remaining-categories': 0 })
  })
})
