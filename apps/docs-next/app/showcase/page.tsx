import { SHOWCASE } from '@/lib/showcase'
import { ShowcaseGrid } from '@/components/showcase/grid'

export const metadata = {
  title: 'Showcase — runnable AgentsKit examples',
  description:
    'Every example mock-runs in your browser. Click any card to open the full playground. Filter by tag.',
}

export default function ShowcasePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-foam">Showcase</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
          {SHOWCASE.length} runnable examples
        </h1>
        <p className="mt-3 max-w-2xl text-ak-graphite">
          Every card below is a real, interactive demo — no API keys, no setup. Click to open the full playground.
        </p>
      </div>
      <ShowcaseGrid />
    </main>
  )
}
