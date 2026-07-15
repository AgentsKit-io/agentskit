import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { Browse } from '../(home)/_components/browse'
import { baseOptions } from '../layout.config'
import { getRegistryIndex } from '@/lib/registry'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Browse AI agents',
  description: 'Search, qualify, compare, and copy ready-to-use AgentsKit agents into your project.',
  alternates: { canonical: 'https://registry.agentskit.io/agents' },
}

const ecosystemSteps = [
  { name: 'AgentsKit', href: 'https://www.agentskit.io', action: 'Build and extend the agent.' },
  { name: 'AgentsKit Chat', href: 'https://chat.agentskit.io/docs', action: 'Deliver a native chat experience.' },
  { name: 'Agents Playbook', href: 'https://playbook.agentskit.io', action: 'Apply engineering and delivery standards.' },
  { name: 'Doc Bridge', href: 'https://agentskit-io.github.io/doc-bridge/', action: 'Keep documentation handoffs agent-ready.' },
  { name: 'Code Review', href: 'https://github.com/AgentsKit-io/code-review-cli', action: 'Review the diff before merge.' },
  { name: 'AKOS', href: 'https://akos.agentskit.io', action: 'Operate with enterprise controls.' },
] as const

export default async function AgentsPage() {
  const agents = await getRegistryIndex()

  return (
    <HomeLayout {...baseOptions}>
      <main className="w-full">
        <header className="border-b border-ak-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-wider text-ak-blue">AgentsKit Registry</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold text-ak-foam sm:text-5xl">Find a working agent. Keep ownership of the code.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ak-graphite sm:text-lg">
              Search by task or capability, filter by review evidence and CLI support, then compare up to three agents before copying one into your project.
            </p>
          </div>
        </header>

        <Suspense fallback={<div className="mx-auto h-96 max-w-5xl px-4 py-14 text-sm text-ak-graphite">Loading agents…</div>}>
          <Browse agents={agents} basePath="/agents" />
        </Suspense>

        <section aria-labelledby="continue-ecosystem" className="border-t border-ak-border px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-wider text-ak-blue">Continue with context</p>
            <h2 id="continue-ecosystem" className="mt-3 max-w-2xl font-display text-3xl font-semibold text-ak-foam">The next tool should match the next problem.</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ecosystemSteps.map((step) => (
                <Link key={step.name} href={step.href} className="group min-h-36 border-t-2 border-ak-border bg-ak-surface p-5 transition hover:border-ak-blue focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ak-blue">
                  <h3 className="font-semibold text-ak-foam group-hover:text-ak-blue">{step.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-ak-graphite">{step.action}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </HomeLayout>
  )
}
