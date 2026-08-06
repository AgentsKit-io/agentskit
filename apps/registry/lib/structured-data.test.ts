import { describe, expect, it } from 'vitest'
import { registryStructuredData, serializedRegistryStructuredData } from './structured-data'

describe('registry structured data', () => {
  it('publishes canonical website, collection, source, and organization identities', () => {
    expect(JSON.parse(serializedRegistryStructuredData)).toEqual(registryStructuredData)
    expect(registryStructuredData['@graph']).toContainEqual(expect.objectContaining({
      '@type': 'WebSite',
      '@id': 'https://registry.agentskit.io/#website',
      url: 'https://registry.agentskit.io',
    }))
    expect(registryStructuredData['@graph']).toContainEqual(expect.objectContaining({
      '@type': 'CollectionPage',
      '@id': 'https://registry.agentskit.io/#collection',
      isPartOf: { '@id': 'https://registry.agentskit.io/#website' },
    }))
    expect(registryStructuredData['@graph']).toContainEqual(expect.objectContaining({
      '@type': 'SoftwareSourceCode',
      codeRepository: 'https://github.com/AgentsKit-io/agentskit-registry',
      license: 'https://github.com/AgentsKit-io/agentskit-registry/blob/main/LICENSE',
      programmingLanguage: 'TypeScript',
    }))
  })
})
