import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAgent, getRegistryIndex } from '@/lib/registry'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const agents = await getRegistryIndex()
  return agents.map((a) => ({ id: a.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await getAgent(id)
  if (!agent) return { title: 'Agent not found' }
  return { title: agent.title, description: agent.description }
}

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await getAgent(id)
  if (!agent) notFound()

  const required = (agent.env ?? []).filter((e) => e.required)

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <Link href="/" className="font-mono text-xs text-ak-graphite hover:text-ak-blue">
        ← all agents
      </Link>

      <div className="mt-4 mb-6">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-ak-blue">{agent.category}</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ak-foam">{agent.title}</h1>
        <p className="mt-2 text-ak-graphite">{agent.description}</p>
      </div>

      <h2 className="mt-6 mb-2 font-mono text-xs uppercase tracking-[0.18em] text-ak-graphite">Add it</h2>
      <div className="rounded-lg border border-ak-border bg-ak-surface/40 px-4 py-3 font-mono text-sm text-ak-foam">
        npx agentskit add {agent.id}
      </div>

      <h2 className="mt-6 mb-2 font-mono text-xs uppercase tracking-[0.18em] text-ak-graphite">Packages</h2>
      <div className="flex flex-wrap gap-2">
        {agent.packages.map((p) => (
          <span key={p} className="rounded-full border border-ak-border px-3 py-1 font-mono text-xs text-ak-graphite">
            {p}
          </span>
        ))}
      </div>

      {required.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 font-mono text-xs uppercase tracking-[0.18em] text-ak-graphite">Required env</h2>
          <ul className="space-y-1 text-sm text-ak-graphite">
            {required.map((e) => (
              <li key={e.name}>
                <span className="font-mono text-ak-foam">{e.name}</span> — {e.description}
              </li>
            ))}
          </ul>
        </>
      )}

      {agent.skill?.systemPrompt && (
        <details className="mt-6">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.18em] text-ak-graphite">
            System prompt
          </summary>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-lg border border-ak-border bg-ak-surface/40 p-4 text-sm text-ak-graphite">
            {agent.skill.systemPrompt}
          </pre>
        </details>
      )}

      <p className="mt-8 text-sm text-ak-graphite">
        {agent.source ? `Adapted from ${agent.source} · ` : ''}
        {agent.license ?? 'MIT'} ·{' '}
        <a
          className="text-ak-blue hover:underline"
          href={`https://github.com/AgentsKit-io/agentskit-registry/tree/main/registry/${agent.id}`}
        >
          view source
        </a>{' '}
        ·{' '}
        <Link href="/docs/authoring" className="text-ak-blue hover:underline">
          create your own
        </Link>
      </p>
    </main>
  )
}
