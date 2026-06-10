import Link from 'next/link'
import { getRegistryIndex, groupByCategory } from '@/lib/registry'

export const metadata = {
  title: 'Agents — ready-to-use AI agents for AgentsKit',
  description:
    'Browse ready-to-use AI agents. Copy the source into your project with `npx agentskit add <agent>` — you own the code. No lock-in.',
}

export const revalidate = 3600

export default async function AgentsPage() {
  const agents = await getRegistryIndex()
  const byCategory = groupByCategory(agents)
  const categories = Object.keys(byCategory).sort()

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-foam">Registry</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ak-foam">Ready-to-use agents</h1>
        <p className="mt-3 max-w-2xl text-ak-graphite">
          Copy an agent&apos;s source into your project — you own the code, no new framework dependency.
        </p>
        <div className="mt-4 rounded-lg border border-ak-border bg-ak-surface/40 px-4 py-3 font-mono text-sm text-ak-foam">
          npx agentskit add &lt;agent&gt;
        </div>
      </div>

      {agents.length === 0 ? (
        <p className="text-ak-graphite">Could not load the registry. Try again shortly.</p>
      ) : (
        categories.map((cat) => (
          <section key={cat} className="mb-10">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-ak-graphite">{cat}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {byCategory[cat].map((a) => (
                <Link
                  key={a.id}
                  href={`/agents/${a.id}`}
                  className="flex flex-col gap-2 rounded-xl border border-ak-border bg-ak-surface/40 p-4 transition hover:border-ak-foam/40"
                >
                  <span className="font-medium text-ak-foam">{a.title}</span>
                  <span className="line-clamp-3 text-sm text-ak-graphite">{a.description}</span>
                  <span className="mt-auto font-mono text-[11px] text-ak-blue">npx agentskit add {a.id}</span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}

      <p className="mt-8 text-sm text-ak-graphite">
        {agents.length} agents ·{' '}
        <a
          className="underline decoration-dotted underline-offset-2 hover:text-ak-blue"
          href="https://github.com/AgentsKit-io/agentskit-registry"
        >
          source on GitHub
        </a>{' '}
        ·{' '}
        <a
          className="underline decoration-dotted underline-offset-2 hover:text-ak-blue"
          href="https://github.com/AgentsKit-io/agentskit-registry/blob/main/CONTRIBUTING.md"
        >
          contribute an agent
        </a>
      </p>
    </main>
  )
}
