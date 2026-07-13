import { SHOWCASE } from '@/lib/showcase'
import { ShowcaseGrid } from '@/components/showcase/grid'

export const metadata = {
  title: 'Showcase — runnable AgentsKit examples',
  description:
    'Browse runnable AgentsKit examples and open any card in its full browser playground. Filter by tag.',
}

export default function ShowcasePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-foam">Showcase</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ak-foam">
          {SHOWCASE.length} runnable examples
        </h1>
        <p className="mt-3 max-w-2xl text-ak-graphite">
          Every card opens a real interactive demo — no API keys, no setup. Filter the gallery, then launch the full playground.
        </p>
      </div>
      <ShowcaseGrid />
    </main>
  )
}
