import evals from '@/data/evals.json'

export const metadata = {
  title: 'Adapter evals — AgentsKit.js',
  description: 'Side-by-side accuracy and latency scores per adapter. Seed data today; regenerated from @agentskit/eval in CI tomorrow.',
}

type Suite = {
  name: string
  description: string
  scale: 'percent' | 'ms-lower-better'
  results: { adapter: string; score: number; runs: number }[]
}

const BAR_MAX = 320

function format(scale: Suite['scale'], value: number) {
  return scale === 'percent' ? `${value}%` : `${value} ms`
}

function ranked(suite: Suite) {
  const copy = [...suite.results]
  const lowerBetter = suite.scale === 'ms-lower-better'
  copy.sort((a, b) => (lowerBetter ? a.score - b.score : b.score - a.score))
  return copy
}

function width(suite: Suite, score: number) {
  const scores = suite.results.map((r) => r.score)
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  if (suite.scale === 'ms-lower-better') {
    return Math.max(12, Math.round(BAR_MAX * (1 - (score - min) / (max - min + 1))))
  }
  return Math.max(12, Math.round(BAR_MAX * (score / 100)))
}

export default function EvalsPage() {
  const data = evals as { generatedAt: string; note: string; suites: Suite[] }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-foam">Evals</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">Adapter scoreboard</h1>
        <p className="mt-3 max-w-2xl text-ak-graphite">
          Accuracy on tool-use and planning, plus streaming latency. Runs come from{' '}
          <code className="font-mono text-ak-foam">@agentskit/eval</code>. Today's numbers are seed data — the CI pipeline will swap them as real runs land.
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
          Last updated: {new Date(data.generatedAt).toISOString().slice(0, 10)}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {data.suites.map((suite) => (
          <section key={suite.name} className="rounded-lg border border-ak-border bg-ak-surface p-5">
            <header className="mb-3">
              <h2 className="font-display text-xl font-semibold text-white">{suite.name}</h2>
              <p className="mt-1 text-sm text-ak-graphite">{suite.description}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
                {suite.scale === 'percent' ? 'higher is better' : 'lower is better'}
              </p>
            </header>
            <ul className="flex flex-col gap-2">
              {ranked(suite).map((r, i) => (
                <li key={r.adapter} className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-right font-mono text-[10px] text-ak-graphite">
                    {i + 1}.
                  </span>
                  <span className="w-52 shrink-0 font-mono text-xs text-white">{r.adapter}</span>
                  <span
                    className="h-3 rounded bg-gradient-to-r from-ak-foam/80 via-ak-foam/60 to-ak-foam/40"
                    style={{ width: width(suite, r.score) }}
                    aria-hidden
                  />
                  <span className="ml-auto font-mono text-xs text-ak-foam">
                    {format(suite.scale, r.score)}
                  </span>
                  <span className="font-mono text-[10px] text-ak-graphite">
                    · n={r.runs}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 rounded-lg border border-ak-border bg-ak-surface p-4 text-xs text-ak-graphite">
        Want to reproduce? Every suite corresponds to a file under <code className="font-mono">packages/eval/tests/scoreboard/</code>. Run <code className="font-mono">pnpm --filter @agentskit/eval bench</code> locally.
      </p>
    </main>
  )
}
