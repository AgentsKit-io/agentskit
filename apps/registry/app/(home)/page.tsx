import Link from 'next/link'
import { getRegistryIndex } from '@/lib/registry'
import { Gallery } from './gallery'

export const revalidate = 3600

export const metadata = {
  title: 'AgentsKit Registry — ready-to-use AI agents',
  description: 'Browse ready-to-use AI agents. Copy the source into your project with `npx agentskit add <agent>`.',
}

export default async function HomePage() {
  const agents = await getRegistryIndex()

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-blue">Registry</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ak-foam">Ready-to-use agents</h1>
        <p className="mt-3 max-w-2xl text-ak-graphite">
          Copy an agent&apos;s source into your project — you own the code, no new framework dependency. Built on{' '}
          <a className="text-ak-blue hover:underline" href="https://www.agentskit.io">
            AgentsKit
          </a>
          .
        </p>
        <div className="mt-4 rounded-lg border border-ak-border bg-ak-surface/40 px-4 py-3 font-mono text-sm text-ak-foam">
          npx agentskit add &lt;agent&gt;
        </div>
        <p className="mt-3 font-mono text-xs text-ak-graphite">
          <Link href="/docs/using" className="text-ak-blue hover:underline">
            how to use →
          </Link>
          <span className="mx-2">·</span>
          <Link href="/docs/authoring" className="text-ak-blue hover:underline">
            create your own →
          </Link>
        </p>
        <p className="mt-4 max-w-2xl text-sm text-ak-graphite">
          Part of the AgentsKit ecosystem: build with the{' '}
          <a className="text-ak-blue hover:underline" href="https://www.agentskit.io">framework</a>, follow the{' '}
          <a className="text-ak-blue hover:underline" href="https://playbook.agentskit.io">Playbook</a>, grab agents
          here, and run them in production on{' '}
          <a className="text-ak-blue hover:underline" href="https://akos.agentskit.io">AKOS</a>.
        </p>
      </div>

      {agents.length === 0 ? (
        <p className="text-ak-graphite">Could not load the registry. Try again shortly.</p>
      ) : (
        <Gallery agents={agents} />
      )}
    </main>
  )
}
