import { getRegistryIndex } from '@/lib/registry'
import { sortedCategories, agentPrompt } from './_components/categories'
import { LandingFx } from './_components/landing-fx'
import { Hero } from './_components/hero'
import { DemoFlow, type DemoAgent } from './_components/demo-flow'
import { WhatIs, PromptSection, StarCta } from './_components/extras'
import { WorksWith } from './_components/works-with'
import { Browse } from './_components/browse'
import { InstallSteps } from './_components/install-steps'

export const revalidate = 3600

export const metadata = {
  title: 'AgentsKit Registry — ready-to-use AI agents',
  description:
    'The shadcn for AI agents. Copy a production-grade agent into your project with one command — you own the code, no lock-in.',
}

const SAMPLE = ['research', 'code-review', 'support-triage-bot', 'legal-contract-reviewer']
const DEMO = [
  'research', 'code-review', 'marketing-copy-author', 'legal-contract-reviewer', 'support-triage-bot',
  'fintech-fraud-investigator', 'clinical-intake-triage', 'agency-deck-builder', 'coding-code-qa',
  'marketing-competitor-researcher', 'legal-discovery-reviewer', 'support-kb-searcher', 'fintech-kyc-screener',
  'knowledge-promoter', 'coding-prd-author',
]

export default async function HomePage() {
  const agents = await getRegistryIndex()
  const byId = new Map(agents.map((a) => [a.id, a]))
  const categoryCount = sortedCategories(agents.map((a) => a.category)).length

  const sampleIds = SAMPLE.filter((id) => byId.has(id))
  const demoAgents: DemoAgent[] = DEMO.map((id) => byId.get(id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({ id: a.id, title: a.title, category: a.category, runnable: a.runnable }))

  const promptSource = byId.get('research') ?? agents[0]
  const prompt = promptSource ? agentPrompt(promptSource) : ''

  return (
    <main className="w-full">
      <LandingFx />
      <Hero agentCount={agents.length} categoryCount={categoryCount} sampleIds={sampleIds} />
      {demoAgents.length >= 5 && (
        <DemoFlow agents={demoAgents} agentCount={agents.length} categoryCount={categoryCount} />
      )}
      <WhatIs />
      <Browse agents={agents} />
      <InstallSteps />
      <WorksWith />
      {prompt && <PromptSection prompt={prompt} />}
      <StarCta />
    </main>
  )
}
