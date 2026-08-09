import Link from 'next/link'
import { STEPS } from '@/lib/learn-steps'
import { Stepper } from '@/components/learn/stepper'
import { canonicalUrl } from '@/lib/canonical-url'

export const metadata = {
  title: 'Learn AgentsKit — interactive tutorial',
  description:
    'Ship a streaming chat, swap providers, register tools, and persist memory. Runs in your browser. Progress saved locally.',
  alternates: { canonical: canonicalUrl('/learn') },
}

export default function LearnIndex() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-10">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-foam">Interactive tutorial</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ak-foam">Learn AgentsKit in 5 steps</h1>
        <p className="mt-3 max-w-2xl text-ak-graphite">
          End-to-end: install, build a streaming chat, swap providers, register tools, persist memory. Every step
          runs in your browser — no API keys required. Progress is saved locally.
        </p>
      </div>

      <div className="flex flex-col gap-10 md:flex-row">
        <Stepper />
        <section className="flex-1">
          <ol className="grid gap-3">
            {STEPS.map((s, i) => (
              <li key={s.slug}>
                <Link
                  href={`/learn/${s.slug}`}
                  className="block rounded-lg border border-ak-border bg-ak-surface p-4 transition hover:border-ak-foam"
                >
                  <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
                    Step {i + 1}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-ak-foam">{s.title}</div>
                  <p className="mt-1 text-sm text-ak-graphite">{s.intro}</p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  )
}
