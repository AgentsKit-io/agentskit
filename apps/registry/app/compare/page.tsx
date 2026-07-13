import Link from 'next/link'
import type { Metadata } from 'next'
import { getAgent, getRegistryIndex } from '@/lib/registry'
import type { RegistryAgentDetail } from '@/lib/registry'
import { mergeComparisonSummary, parseCompareIds } from '@/lib/catalog'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Compare AI agents',
  description: 'Compare AgentsKit agents by independent review evidence, runtime support, packages, and setup requirements.',
  robots: { index: false, follow: true },
}

function valueOrDash(value: React.ReactNode) {
  return value || <span className="text-ak-border">Not specified</span>
}

function AgentColumn({ agent }: { agent: RegistryAgentDetail }) {
  return (
    <div className="min-w-52 py-1">
      <p className="font-mono text-xs uppercase text-ak-blue">{agent.category}</p>
      <h2 className="mt-2 text-lg font-semibold text-ak-foam">{agent.title}</h2>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-ak-graphite">{agent.description}</p>
      <Link href={`/agents/${agent.id}`} className="mt-4 inline-block text-sm text-ak-blue hover:underline">Open agent</Link>
    </div>
  )
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ agents?: string | string[] }> }) {
  const [{ agents: rawIds }, index] = await Promise.all([searchParams, getRegistryIndex()])
  const ids = parseCompareIds(rawIds, new Set(index.map((agent) => agent.id)))
  const summaries = new Map(index.map((agent) => [agent.id, agent]))
  const details = (await Promise.all(ids.map((id) => getAgent(id))))
    .filter((agent): agent is RegistryAgentDetail => agent !== null)
    .map((agent) => mergeComparisonSummary(agent, summaries.get(agent.id)))

  if (details.length < 2) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <p className="font-mono text-xs uppercase text-ak-blue">Agent comparison</p>
        <h1 className="mt-3 text-3xl font-semibold text-ak-foam">Choose at least two agents</h1>
        <p className="mt-4 max-w-xl leading-7 text-ak-graphite">Select two or three agents in the catalog to compare their review evidence, capabilities, and setup requirements.</p>
        <Link href={`/?compare=${ids.join(',')}#agents`} className="mt-7 inline-flex h-10 items-center rounded-md bg-ak-blue px-4 text-sm font-semibold text-ak-midnight hover:brightness-110">Browse agents</Link>
      </main>
    )
  }

  const selected = details.map((agent) => agent.id).join(',')

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ak-graphite">
        <Link href={`/?compare=${selected}#agents`} className="hover:text-ak-blue">Agents</Link>
        <span className="px-2">/</span>
        <span aria-current="page" className="text-ak-foam">Compare</span>
      </nav>

      <header className="mt-8 border-b border-ak-border pb-8">
        <p className="font-mono text-xs uppercase text-ak-blue">Decision workspace</p>
        <h1 className="mt-3 text-3xl font-semibold text-ak-foam sm:text-4xl">Compare agents</h1>
        <p className="mt-4 max-w-2xl leading-7 text-ak-graphite">Review the published facts side by side. Final quality, cost, and latency still depend on your provider, model, tools, and evaluation inputs.</p>
        <Link href={`/?compare=${selected}#agents`} className="mt-5 inline-block text-sm text-ak-blue hover:underline">Edit selection</Link>
      </header>

      <div className="mt-8 overflow-x-auto border-y border-ak-border">
        <table className="w-full min-w-[52rem] table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">Comparison of {details.map((agent) => agent.title).join(', ')}</caption>
          <colgroup>
            <col className="w-40" />
            {details.map((agent) => <col key={agent.id} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-ak-border align-top">
              <th scope="col" className="px-4 py-5 text-xs font-semibold uppercase text-ak-graphite">Agent</th>
              {details.map((agent) => <th key={agent.id} scope="col" className="border-l border-ak-border px-5 py-5 font-normal"><AgentColumn agent={agent} /></th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-ak-border">
            <tr className="align-top">
              <th scope="row" className="px-4 py-5 font-medium text-ak-foam">Independent review</th>
              {details.map((agent) => (
                <td key={agent.id} className="border-l border-ak-border px-5 py-5">
                  {agent.validation ? (
                    <><strong className="text-lg text-ak-green">{agent.validation.score}/100</strong><span className="mt-1 block text-ak-graphite">{Math.round(agent.validation.confidence * 100)}% confidence · {agent.validation.cases} cases</span></>
                  ) : <span className="text-ak-graphite">No qualifying independent evidence</span>}
                </td>
              ))}
            </tr>
            <tr className="align-top">
              <th scope="row" className="px-4 py-5 font-medium text-ak-foam">CLI execution</th>
              {details.map((agent) => <td key={agent.id} className="border-l border-ak-border px-5 py-5 text-ak-graphite">{agent.runnable ? <span className="text-ak-green">Runnable</span> : 'Source install only'}</td>)}
            </tr>
            <tr className="align-top">
              <th scope="row" className="px-4 py-5 font-medium text-ak-foam">Capabilities</th>
              {details.map((agent) => <td key={agent.id} className="border-l border-ak-border px-5 py-5 text-ak-graphite">{valueOrDash(agent.tags?.join(', '))}</td>)}
            </tr>
            <tr className="align-top">
              <th scope="row" className="px-4 py-5 font-medium text-ak-foam">Packages</th>
              {details.map((agent) => <td key={agent.id} className="border-l border-ak-border px-5 py-5">{agent.packages.map((pkg) => <code key={pkg} className="mb-2 block break-all text-xs text-ak-foam">{pkg}</code>)}</td>)}
            </tr>
            <tr className="align-top">
              <th scope="row" className="px-4 py-5 font-medium text-ak-foam">Required environment</th>
              {details.map((agent) => {
                const required = (agent.env ?? []).filter((item) => item.required)
                return <td key={agent.id} className="border-l border-ak-border px-5 py-5">{required.length > 0 ? required.map((item) => <code key={item.name} className="mb-2 block text-xs text-ak-foam">{item.name}</code>) : <span className="text-ak-graphite">None declared</span>}</td>
              })}
            </tr>
            <tr className="align-top">
              <th scope="row" className="px-4 py-5 font-medium text-ak-foam">Release</th>
              {details.map((agent) => <td key={agent.id} className="border-l border-ak-border px-5 py-5 text-ak-graphite">v{agent.version ?? '1.0.0'} · {agent.license ?? 'MIT'}</td>)}
            </tr>
            <tr className="align-top">
              <th scope="row" className="px-4 py-5 font-medium text-ak-foam">Install</th>
              {details.map((agent) => <td key={agent.id} className="border-l border-ak-border px-5 py-5"><code className="block break-all text-xs text-ak-foam">npx agentskit add {agent.id}</code></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  )
}
