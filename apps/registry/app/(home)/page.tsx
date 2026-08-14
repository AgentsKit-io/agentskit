import { Suspense } from 'react'
import { getRegistryIndex } from '@/lib/registry'
import { sortedCategories } from './_components/categories'
import { LandingFx } from './_components/landing-fx'
import { Hero } from './_components/hero'
import { Browse } from './_components/browse'
import { InstallSteps } from './_components/install-steps'
import { EcosystemShowcase } from './_components/ecosystem-showcase'

export const revalidate = 3600

export const metadata = {
  title: 'AgentsKit Registry — ready-to-use AI agents',
  description:
    'Ready-to-use AI agents for AgentsKit. Copy production-grade source into your project with one command — you own the code, no lock-in.',
  alternates: { canonical: 'https://registry.agentskit.io' },
}

const SAMPLE = ['research', 'code-review', 'support-triage-bot', 'legal-contract-reviewer']
export default async function HomePage() {
  const agents = await getRegistryIndex()
  const byId = new Map(agents.map((a) => [a.id, a]))
  const categoryCount = sortedCategories(agents.map((a) => a.category)).length

  const sampleIds = SAMPLE.filter((id) => byId.has(id))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://registry.agentskit.io/#website',
        name: 'AgentsKit Registry',
        url: 'https://registry.agentskit.io/',
      },
      {
        '@type': 'CollectionPage',
        '@id': 'https://registry.agentskit.io/#webpage',
        name: 'AgentsKit Registry — ready-to-use AI agents',
        url: 'https://registry.agentskit.io/',
        isPartOf: { '@id': 'https://registry.agentskit.io/#website' },
        numberOfItems: agents.length,
        mainEntity: {
          '@type': 'ItemList',
          '@id': 'https://registry.agentskit.io/#agents',
          name: 'AgentsKit Registry agents',
          numberOfItems: agents.length,
          itemListElement: agents.map((agent, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: agent.title,
            url: `https://registry.agentskit.io/agents/${encodeURIComponent(agent.id)}`,
          })),
        },
      },
    ],
  }

  return (
    <main className="w-full">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <LandingFx />
      <Hero agentCount={agents.length} categoryCount={categoryCount} sampleIds={sampleIds} />
      <Suspense fallback={<div className="mx-auto h-96 max-w-5xl px-4 py-14 text-sm text-ak-graphite">Loading agents…</div>}>
        <Browse agents={agents} />
      </Suspense>
      <InstallSteps />
      <EcosystemShowcase />
    </main>
  )
}
