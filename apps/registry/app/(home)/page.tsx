import { Suspense } from 'react'
import { getRegistryIndex } from '@/lib/registry'
import { sortedCategories } from './_components/categories'
import { LandingFx } from './_components/landing-fx'
import { Hero } from './_components/hero'
import { Browse } from './_components/browse'
import { InstallSteps } from './_components/install-steps'

export const revalidate = 3600

export const metadata = {
  title: 'AgentsKit Registry — ready-to-use AI agents',
  description:
    'The shadcn for AI agents. Copy a production-grade agent into your project with one command — you own the code, no lock-in.',
  alternates: { canonical: 'https://registry.agentskit.io' },
}

const SAMPLE = ['research', 'code-review', 'support-triage-bot', 'legal-contract-reviewer']
export default async function HomePage() {
  const agents = await getRegistryIndex()
  const byId = new Map(agents.map((a) => [a.id, a]))
  const categoryCount = sortedCategories(agents.map((a) => a.category)).length

  const sampleIds = SAMPLE.filter((id) => byId.has(id))

  return (
    <main className="w-full">
      <LandingFx />
      <Hero agentCount={agents.length} categoryCount={categoryCount} sampleIds={sampleIds} />
      <Suspense fallback={<div className="mx-auto h-96 max-w-5xl px-4 py-14 text-sm text-ak-graphite">Loading agents…</div>}>
        <Browse agents={agents} />
      </Suspense>
      <InstallSteps />
    </main>
  )
}
