export const registryStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.agentskit.io/#organization',
      name: 'AgentsKit',
      url: 'https://www.agentskit.io',
      sameAs: ['https://github.com/AgentsKit-io'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://registry.agentskit.io/#website',
      name: 'AgentsKit Registry',
      description: 'A public catalog of validated, source-owned AI agents for AgentsKit.',
      url: 'https://registry.agentskit.io',
      publisher: { '@id': 'https://www.agentskit.io/#organization' },
      inLanguage: 'en',
    },
    {
      '@type': 'CollectionPage',
      '@id': 'https://registry.agentskit.io/#collection',
      name: 'AgentsKit Registry agent catalog',
      description: 'Browse validated TypeScript agents, copy their source, and adapt them inside your project.',
      url: 'https://registry.agentskit.io',
      isPartOf: { '@id': 'https://registry.agentskit.io/#website' },
      about: { '@id': 'https://registry.agentskit.io/#source' },
    },
    {
      '@type': 'SoftwareSourceCode',
      '@id': 'https://registry.agentskit.io/#source',
      name: 'AgentsKit Registry',
      codeRepository: 'https://github.com/AgentsKit-io/agentskit-registry',
      license: 'https://github.com/AgentsKit-io/agentskit-registry/blob/main/LICENSE',
      programmingLanguage: 'TypeScript',
      author: { '@id': 'https://www.agentskit.io/#organization' },
    },
  ],
} as const

export const serializedRegistryStructuredData = JSON.stringify(registryStructuredData).replaceAll('<', '\\u003c')
