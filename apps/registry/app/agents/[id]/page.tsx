import Link from 'next/link'
import { notFound } from 'next/navigation'
import { factoryName, getAgent, getRegistryIndex } from '@/lib/registry'

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
  const url = `https://registry.agentskit.io/agents/${id}`
  return {
    title: agent.title,
    description: agent.description,
    alternates: { canonical: url },
    openGraph: { title: agent.title, description: agent.description, url, type: 'article' },
    twitter: { card: 'summary_large_image', title: agent.title, description: agent.description },
  }
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 mb-2 font-mono text-xs uppercase tracking-[0.18em] text-ak-graphite">{children}</h2>
}
function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg border border-ak-border bg-ak-surface/40 p-4 text-sm text-ak-foam">
      <code>{children}</code>
    </pre>
  )
}

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await getAgent(id)
  if (!agent) notFound()

  const fn = `create${factoryName(agent.id)}Agent`
  const dir = `./agents/${agent.id}`
  const required = (agent.env ?? []).filter((e) => e.required)
  const agentSrc = agent.sources?.find((s) => s.path === 'agent.ts')?.content

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

      <div className="rounded-xl border border-ak-border bg-ak-surface/30 p-4 text-sm text-ak-graphite">
        Copy the source into your project, then run it. Pass optional config to wire tools, RAG, MCP, memory,
        permissions, and orchestration — all overridable. Full guides:{' '}
        <Link href="/docs/using" className="text-ak-blue hover:underline">
          Using
        </Link>{' '}
        ·{' '}
        <Link href="/docs/authoring" className="text-ak-blue hover:underline">
          Create your own
        </Link>
        .
      </div>

      <H2>Add it</H2>
      <Code>{`npx agentskit add ${agent.id}`}</Code>

      <H2>Use it</H2>
      <Code>{`import { openai } from '@agentskit/adapters'
import { ${fn} } from '${dir}/agent'

const agent = ${fn}({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o' }),
})
const { content } = await agent.run('…')`}</Code>
      <p className="text-sm text-ak-graphite">
        Or in one command: <code className="text-ak-foam">npx agentskit add {agent.id} --run &quot;…&quot; --provider ollama</code>.
        Provider/model can also come from a <code className="text-ak-foam">.agentskit.config.json</code> file.
      </p>

      <H2>Add tools, RAG, MCP, memory, permissions</H2>
      <Code>{`import { webSearch } from '@agentskit/tools'
import { createMcpClient, toolsFromMcpClient } from '@agentskit/tools/mcp'

const agent = ${fn}({
  adapter,
  tools: [webSearch(), ...(await toolsFromMcpClient(await createMcpClient(/* … */)))], // tools + MCP
  retriever: rag.retrieve,             // RAG grounding
  memory,                              // conversation context
  onConfirm: (call) => approve(call),  // per-tool permission (HITL / RBAC)
  observers: [tracer],                 // tracing / audit
})`}</Code>
      <p className="text-sm text-ak-graphite">
        For orchestration, agents expose <code className="text-ak-foam">.asHandle()</code> for{' '}
        <code className="text-ak-foam">supervisor</code> / <code className="text-ak-foam">swarm</code>. See{' '}
        <Link href="/docs/using" className="text-ak-blue hover:underline">
          Using
        </Link>
        .
      </p>

      <H2>Packages</H2>
      <div className="flex flex-wrap gap-2">
        {agent.packages.map((p) => (
          <span key={p} className="rounded-full border border-ak-border px-3 py-1 font-mono text-xs text-ak-graphite">
            {p}
          </span>
        ))}
      </div>

      {required.length > 0 && (
        <>
          <H2>Required env</H2>
          <ul className="space-y-1 text-sm text-ak-graphite">
            {required.map((e) => (
              <li key={e.name}>
                <span className="font-mono text-ak-foam">{e.name}</span> — {e.description}
              </li>
            ))}
          </ul>
        </>
      )}

      {agentSrc && (
        <>
          <H2>agent.ts — the factory</H2>
          <Code>{agentSrc}</Code>
        </>
      )}

      <p className="mt-8 text-sm text-ak-graphite">
        {agent.source ? `Adapted from ${agent.source} · ` : ''}
        {agent.license ?? 'MIT'} ·{' '}
        <a
          className="text-ak-blue hover:underline"
          href={`https://github.com/AgentsKit-io/agentskit-registry/tree/main/registry/${agent.id}`}
        >
          view source
        </a>
      </p>
    </main>
  )
}
