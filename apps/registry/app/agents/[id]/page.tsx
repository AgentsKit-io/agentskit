import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { factoryName, getAgent, getRegistryIndex, relatedAgents } from '@/lib/registry'
import type { RegistryValidationEvidence } from '@/lib/registry'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const agents = await getRegistryIndex()
  return agents.map((agent) => ({ id: agent.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await getAgent(id)
  if (!agent) return { title: 'Agent not found', robots: { index: false } }
  const url = `https://registry.agentskit.io/agents/${id}`
  return {
    title: `${agent.title} AI agent`,
    description: agent.description,
    alternates: { canonical: url },
    openGraph: { title: `${agent.title} — AgentsKit Registry`, description: agent.description, url, type: 'article' },
    twitter: { card: 'summary_large_image', title: agent.title, description: agent.description },
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 mt-10 text-xl font-semibold text-ak-foam">{children}</h2>
}

function examplesFromReadme(readme: string | undefined): Array<{ language: string; code: string }> {
  if (!readme) return []
  return [...readme.matchAll(/```([\w-]*)\n([\s\S]*?)```/g)]
    .map((match) => ({ language: match[1] || 'text', code: match[2].trim() }))
    .filter((example) => example.language !== 'bash' && example.language !== 'sh')
    .slice(0, 2)
}

function ReviewEvidence({ validation }: { validation: RegistryValidationEvidence }) {
  const metrics = [
    ['Review score', `${validation.score}/100`],
    ['Confidence', `${Math.round(validation.confidence * 100)}%`],
    ['Evaluation cases', String(validation.cases)],
    ['Iterations', String(validation.iterations)],
  ]

  return (
    <section aria-labelledby="independent-review">
      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase text-ak-green">Independent reviewer approved</p>
          <h2 id="independent-review" className="mt-2 text-xl font-semibold text-ak-foam">Validation evidence</h2>
        </div>
        <Link href="/docs/validation" className="text-sm text-ak-blue hover:underline">How validation works</Link>
      </div>

      <dl className="mt-5 grid grid-cols-2 border-y border-ak-border sm:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="py-4 pr-4 sm:border-r sm:border-ak-border sm:pl-4 sm:first:pl-0 sm:last:border-r-0">
            <dt className="text-xs text-ak-graphite">{label}</dt>
            <dd className="mt-1 font-mono text-lg font-semibold text-ak-foam">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 text-sm leading-6 text-ak-graphite">{validation.summary}</p>

      {validation.strengths.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-ak-foam">What passed review</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-ak-graphite">
            {validation.strengths.map((strength) => <li key={strength} className="border-l-2 border-ak-green pl-3">{strength}</li>)}
          </ul>
        </div>
      )}

      {validation.notes.length > 0 && (
        <div className="mt-6 border-l-2 border-ak-blue pl-4">
          <h3 className="text-sm font-semibold text-ak-foam">Reviewer notes</h3>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-ak-graphite">
            {validation.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      )}
    </section>
  )
}

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [agent, index] = await Promise.all([getAgent(id), getRegistryIndex()])
  if (!agent) notFound()

  const fn = `create${factoryName(agent.id)}Agent`
  const required = (agent.env ?? []).filter((env) => env.required)
  const source = agent.sources?.find((item) => item.path === 'agent.ts')?.content
  const readme = agent.sources?.find((item) => item.path === 'README.md')?.content
  const evaluation = agent.sources?.find((item) => item.path === 'eval.ts')?.content
  const examples = examplesFromReadme(readme)
  const related = relatedAgents(agent, index, 4)
  const install = `npx agentskit add ${agent.id}`
  const quickStart = `import { openai } from '@agentskit/adapters'
import { ${fn} } from './agents/${agent.id}/agent'

const agent = ${fn}({
  adapter: openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
  }),
})

const result = await agent.run('Describe your task here')
console.log(result.content)`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: agent.title,
    description: agent.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform',
    softwareVersion: agent.version ?? '1.0.0',
    license: agent.license ?? 'MIT',
    url: `https://registry.agentskit.io/agents/${agent.id}`,
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ak-graphite">
        <Link href="/#agents" className="hover:text-ak-blue">Agents</Link><span>/</span>
        <Link href={`/?category=${agent.category}#agents`} className="capitalize hover:text-ak-blue">{agent.category}</Link><span>/</span>
        <span aria-current="page" className="truncate text-ak-foam">{agent.title}</span>
      </nav>

      <header className="mt-8 grid gap-8 border-b border-ak-border pb-9 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-[0.14em] text-ak-blue">{agent.category}</span>
            <span className="text-ak-border">·</span>
            {agent.validation ? (
              <span className="text-ak-green">Independently reviewed · {agent.validation.score}/100</span>
            ) : (
              <span className="text-ak-graphite">Registry checks passed · v{agent.version ?? '1.0.0'}</span>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold text-ak-foam sm:text-4xl">{agent.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ak-graphite sm:text-lg">{agent.description}</p>
          {agent.tags && agent.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {agent.tags.map((tag) => <span key={tag} className="rounded-full border border-ak-border px-2.5 py-1 text-xs text-ak-graphite">{tag}</span>)}
            </div>
          )}
        </div>
        <div className="self-end rounded-lg border border-ak-border bg-ak-surface p-4">
          <p className="text-xs font-medium text-ak-graphite">Install</p>
          <code className="mt-2 block overflow-x-auto font-mono text-sm text-ak-foam">{install}</code>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link href={`/?compare=${agent.id}#agents`} className="text-ak-blue hover:underline">Compare agent</Link>
            <a href={`/r/${agent.id}.json`} className="text-ak-blue hover:underline">View raw manifest</a>
          </div>
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <article className="min-w-0">
          <SectionTitle>Quick start</SectionTitle>
          <DynamicCodeBlock lang="ts" code={quickStart} />

          {agent.validation && <ReviewEvidence validation={agent.validation} />}

          {examples.length > 0 && (
            <section>
              <SectionTitle>Example</SectionTitle>
              <p className="mb-4 text-sm leading-6 text-ak-graphite">A real usage example maintained with this agent.</p>
              <div className="space-y-4">
                {examples.map((example, index) => <DynamicCodeBlock key={`${example.language}-${index}`} lang={example.language} code={example.code} />)}
              </div>
            </section>
          )}

          <SectionTitle>Extend it</SectionTitle>
          <p className="mb-4 text-sm leading-6 text-ak-graphite">Pass tools, retrieval, memory, permissions, and observers through the factory config.</p>
          <DynamicCodeBlock lang="ts" code={`const agent = ${fn}({
  adapter,
  tools,
  retriever,
  memory,
  onConfirm: (call) => approve(call),
  observers: [tracer],
})`} />

          {required.length > 0 && (
            <section>
              <SectionTitle>Required environment</SectionTitle>
              <ul className="divide-y divide-ak-border border-y border-ak-border text-sm">
                {required.map((env) => <li key={env.name} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]"><code className="text-ak-foam">{env.name}</code><span className="text-ak-graphite">{env.description}</span></li>)}
              </ul>
            </section>
          )}

          {source && (
            <details className="mt-10 border-y border-ak-border py-4">
              <summary className="cursor-pointer font-medium text-ak-foam">View agent factory source</summary>
              <div className="mt-4"><DynamicCodeBlock lang="ts" code={source} /></div>
            </details>
          )}

          {evaluation && (
            <details className="mt-4 border-b border-ak-border py-4">
              <summary className="cursor-pointer font-medium text-ak-foam">View evaluation contract</summary>
              <p className="mt-3 text-sm leading-6 text-ak-graphite">Replay these cases with the provider and model you plan to deploy.</p>
              <div className="mt-4"><DynamicCodeBlock lang="ts" code={evaluation} /></div>
            </details>
          )}
        </article>

        <aside className="lg:pt-10">
          <h2 className="text-sm font-semibold text-ak-foam">Details</h2>
          <dl className="mt-3 space-y-3 border-t border-ak-border pt-3 text-sm">
            <div><dt className="text-ak-graphite">License</dt><dd className="mt-0.5 text-ak-foam">{agent.license ?? 'MIT'}</dd></div>
            <div><dt className="text-ak-graphite">Packages</dt><dd className="mt-1 space-y-1">{agent.packages.map((pkg) => <code key={pkg} className="block break-all text-xs text-ak-foam">{pkg}</code>)}</dd></div>
          </dl>
          <a className="mt-5 inline-block text-sm text-ak-blue hover:underline" href={`https://github.com/AgentsKit-io/agentskit-registry/tree/main/registry/${agent.id}`}>View source on GitHub</a>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14 border-t border-ak-border pt-8">
          <div className="flex items-end justify-between gap-4">
            <div><p className="font-mono text-xs uppercase tracking-[0.14em] text-ak-blue">Keep exploring</p><h2 className="mt-2 text-2xl font-semibold text-ak-foam">Related agents</h2></div>
            <Link href={`/?category=${agent.category}#agents`} className="text-sm text-ak-blue hover:underline">View category</Link>
          </div>
          <div className="mt-6 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <Link key={item.id} href={`/agents/${item.id}`} className="border-t border-ak-border py-4 hover:border-ak-blue">
                <h3 className="font-medium text-ak-foam">{item.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-5 text-ak-graphite">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
