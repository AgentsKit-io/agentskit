import { redirect } from 'next/navigation'
import { getRegistryIndex } from '@/lib/registry'
import { sortedCategories } from './_components/categories'
import { LandingFx } from './_components/landing-fx'
import { Hero } from './_components/hero'
import { InstallSteps } from './_components/install-steps'
import { EcosystemShowcase } from './_components/ecosystem-showcase'
import { ClosingCta } from './_components/closing-cta'
import { SiteFooter } from './_components/site-footer'
import { LiquidCursorGradient } from '@/components/liquid-cursor-gradient'

export const revalidate = 3600

export const metadata = {
  title: 'AgentsKit Registry — ready-to-use AI agents',
  description:
    'Ready-to-use AI agents for AgentsKit. Copy production-grade source into your project with one command — you own the code, no lock-in.',
  alternates: { canonical: 'https://registry.agentskit.io' },
}

const SAMPLE = ['research', 'code-review', 'support-triage-bot', 'legal-contract-reviewer']
export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  if (params.q || params.category || params.sort || params.page) {
    const catalogParams = new URLSearchParams()
    for (const key of ['q', 'category', 'sort'] as const) {
      const value = params[key]
      if (typeof value === 'string' && value) catalogParams.set(key, value)
    }
    const query = catalogParams.size ? `?${catalogParams}` : ''
    redirect(`/agents${query}#agents`)
  }

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
        '@type': 'WebPage',
        '@id': 'https://registry.agentskit.io/#webpage',
        name: 'AgentsKit Registry — ready-to-use AI agents',
        url: 'https://registry.agentskit.io/',
        isPartOf: { '@id': 'https://registry.agentskit.io/#website' },
      },
    ],
  }

  return (
    <div className="rg-home-layout ak-home-layout w-full">
      <LiquidCursorGradient />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <LandingFx />
      <Hero agentCount={agents.length} categoryCount={categoryCount} sampleIds={sampleIds} />
      <InstallSteps />
      <EcosystemShowcase />
      <ClosingCta agentCount={agents.length} />
      <SiteFooter />
    </div>
  )
}
