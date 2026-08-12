import { catalog } from '@agentskit/adapters/catalog'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DOCTOR_PROVIDERS,
  PROVIDER_REGISTRY,
  resolveProviderRegistryEntry,
} from '../src/provider-registry'

describe('provider registry', () => {
  it('has unique ids and explicit doctor surfaces', () => {
    const ids = PROVIDER_REGISTRY.map(entry => entry.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(PROVIDER_REGISTRY.every(entry =>
      entry.env.status && entry.reachability.status && entry.defaultModel.status,
    )).toBe(true)
    expect(DEFAULT_DOCTOR_PROVIDERS).toEqual(['openai', 'anthropic', 'gemini', 'ollama'])
  })

  it('keeps catalog-backed providers and default models aligned', () => {
    for (const entry of PROVIDER_REGISTRY) {
      if (!entry.catalogId) continue
      const provider = catalog.providers.find(candidate => candidate.id === entry.catalogId)
      expect(provider, `${entry.id} → ${entry.catalogId}`).toBeDefined()
      if (entry.defaultModel.status === 'known') {
        expect(
          provider?.models.some(model => model.id === entry.defaultModel.id),
          `${entry.id} default model ${entry.defaultModel.id}`,
        ).toBe(true)
      }
    }
  })

  it('makes catalog providers outside the curated registry explicitly unsupported', () => {
    const registeredCatalogIds = new Set(
      PROVIDER_REGISTRY.flatMap(entry => entry.catalogId ? [entry.catalogId] : []),
    )
    const unregistered = catalog.providers.find(provider => !registeredCatalogIds.has(provider.id))
    expect(unregistered).toBeDefined()

    const fallback = resolveProviderRegistryEntry(unregistered!.id)
    expect(fallback.env.status).toBe('unsupported')
    expect(fallback.reachability.status).toBe('unsupported')
    expect(fallback.defaultModel.status).toBe('unsupported')
  })
})
