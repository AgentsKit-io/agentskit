import type { Metadata } from 'next'
import { Suspense } from 'react'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { Browse } from '../(home)/_components/browse'
import { EcosystemMesh } from '../(home)/_components/ecosystem-mesh'
import { baseOptions } from '../layout.config'
import { getRegistryIndex } from '@/lib/registry'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Browse AI agents',
  description: 'Search, qualify, compare, and copy ready-to-use AgentsKit agents into your project.',
  alternates: { canonical: 'https://registry.agentskit.io/agents' },
}

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

        <EcosystemMesh />
      </main>
    </HomeLayout>
  )
}
