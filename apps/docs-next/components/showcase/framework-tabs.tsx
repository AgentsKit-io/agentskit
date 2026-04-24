'use client'

import { useFramework, FRAMEWORKS } from '@/lib/stack-state'
import type { ShowcaseFramework, ShowcaseMeta } from '@/lib/showcase'
import { stackblitzFor } from '@/lib/showcase'

type Props = {
  meta: ShowcaseMeta
  /** Pre-read React source — rendered when the active framework is react. */
  reactSource: string | null
  /** Pre-read alt-framework sources, keyed by framework value. */
  altSources: Partial<Record<Exclude<ShowcaseFramework, 'react'>, string | null>>
  /** Rendered <Tabs>+<Tab> for the react variant (shared helpers tab stack). */
  reactTabs: React.ReactNode
}

export function ShowcaseFrameworkTabs({ meta, reactSource, altSources, reactTabs }: Props) {
  const [framework, setFramework] = useFramework()

  const available: ShowcaseFramework[] = [
    'react',
    ...(Object.keys(meta.sources ?? {}) as Exclude<ShowcaseFramework, 'react'>[]),
  ]
  const ordered = FRAMEWORKS.map((f) => f.value).filter((f) =>
    available.includes(f as ShowcaseFramework),
  ) as ShowcaseFramework[]

  const activeFramework: ShowcaseFramework = ordered.includes(framework as ShowcaseFramework)
    ? (framework as ShowcaseFramework)
    : 'react'

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1 rounded-md border border-ak-border bg-ak-surface p-1">
        {ordered.map((f) => {
          const meta = FRAMEWORKS.find((x) => x.value === f)!
          const on = f === activeFramework
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFramework(f)}
              className={`rounded px-3 py-1.5 font-mono text-xs transition ${
                on
                  ? 'bg-ak-foam text-ak-midnight'
                  : 'text-ak-graphite hover:text-ak-foam'
              }`}
            >
              {meta.label}
            </button>
          )
        })}
      </div>

      {activeFramework === 'react' ? (
        <div>{reactTabs}</div>
      ) : (
        <AltFrameworkPanel
          framework={activeFramework as Exclude<ShowcaseFramework, 'react'>}
          source={altSources[activeFramework as Exclude<ShowcaseFramework, 'react'>] ?? null}
          reactSource={reactSource}
          meta={meta}
        />
      )}
    </div>
  )
}

function AltFrameworkPanel({
  framework,
  source,
  reactSource,
  meta,
}: {
  framework: Exclude<ShowcaseFramework, 'react'>
  source: string | null
  reactSource: string | null
  meta: ShowcaseMeta
}) {
  const stackblitz = meta.sources?.[framework]?.stackblitz ?? stackblitzFor(framework)
  const frameworkLabel = FRAMEWORKS.find((f) => f.value === framework)?.label ?? framework

  if (source) {
    return (
      <div className="space-y-2">
        <Header framework={framework} stackblitz={stackblitz} />
        <pre className="max-h-[480px] overflow-auto rounded-md border border-ak-border bg-ak-midnight/40 p-3 font-mono text-xs text-ak-foam">
          <code>{source}</code>
        </pre>
      </div>
    )
  }

  const pkgMap: Record<Exclude<ShowcaseFramework, 'react'>, string> = {
    vue: '@agentskit/vue',
    svelte: '@agentskit/svelte',
    solid: '@agentskit/solid',
    angular: '@agentskit/angular',
    'react-native': '@agentskit/react-native',
    ink: '@agentskit/ink',
    node: '@agentskit/runtime',
  }
  const pkg = pkgMap[framework]
  const issueTitle = encodeURIComponent(`docs(showcase): port "${meta.name}" to ${frameworkLabel}`)
  const issueBody = encodeURIComponent(
    `Slug: \`${meta.slug}\`\nFramework: \`${framework}\`\n\n` +
      `- [ ] Read the React source at components/examples/${meta.module}.tsx\n` +
      `- [ ] Port to ${pkg} using the same mock adapter + tools helpers\n` +
      `- [ ] Add the file to lib/showcase.ts under \`sources.${framework}.file\`\n` +
      `- [ ] Optional: update the StackBlitz template url\n\n` +
      `See apps/docs-next/components/showcase/framework-tabs.tsx for the tab contract.`,
  )
  const issueUrl = `https://github.com/AgentsKit-io/agentskit/issues/new?title=${issueTitle}&body=${issueBody}&labels=docs,good%20first%20issue`
  const prUrl = `https://github.com/AgentsKit-io/agentskit/edit/main/apps/docs-next/lib/showcase.ts`

  return (
    <div className="rounded-lg border border-dashed border-ak-border bg-ak-surface p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-ak-midnight/40 font-mono text-xs text-ak-foam">
          {frameworkLabel.slice(0, 2)}
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold text-ak-foam">
          {frameworkLabel} version coming soon
        </h3>
        <p className="mt-1 max-w-lg text-sm text-ak-graphite">
          AgentsKit ships <span className="font-mono text-ak-foam">{pkg}</span> with the same
          contracts (adapter, memory, tools). Port the React example in ~10 lines and we will
          feature your name on the showcase page.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <a
            href={stackblitz}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-ak-foam px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ak-midnight hover:bg-ak-foam/90"
          >
            Open {frameworkLabel} starter on StackBlitz →
          </a>
          {reactSource ? (
            <a
              href="#react-source"
              className="rounded-md border border-ak-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ak-graphite hover:text-ak-foam"
            >
              Copy the React source
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-md border border-ak-border bg-ak-midnight/30 p-4 text-left sm:grid-cols-[auto_1fr]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
          How to contribute
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ak-foam">
          <li>
            Fork the starter on StackBlitz or clone the repo — port{' '}
            <span className="font-mono text-ak-blue">components/examples/{meta.module}.tsx</span>{' '}
            to <span className="font-mono text-ak-blue">{pkg}</span>. Keep the same mock adapter
            + tool stubs from{' '}
            <span className="font-mono text-ak-blue">_shared/mock-adapter.ts</span>.
          </li>
          <li>
            Drop the file under{' '}
            <span className="font-mono text-ak-blue">components/examples/{framework}/</span> and
            add it to{' '}
            <span className="font-mono text-ak-blue">lib/showcase.ts</span> under{' '}
            <span className="font-mono text-ak-blue">sources.{framework}.file</span>. The tab
            renders automatically.
          </li>
          <li>
            Open a PR. Small is good — the tab auto-hides the StackBlitz card and shows your
            source highlighted with shiki.
          </li>
        </ol>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-center">
        <a
          href={issueUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-ak-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ak-graphite hover:text-ak-foam"
        >
          Open a port issue →
        </a>
        <a
          href={prUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-ak-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ak-graphite hover:text-ak-foam"
        >
          Edit showcase.ts on GitHub →
        </a>
        <a
          href="/docs/reference/contribute"
          className="rounded-md border border-ak-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ak-graphite hover:text-ak-foam"
        >
          Contributing guide
        </a>
      </div>
    </div>
  )
}

function Header({
  framework,
  stackblitz,
}: {
  framework: Exclude<ShowcaseFramework, 'react'>
  stackblitz: string
}) {
  const frameworkLabel = FRAMEWORKS.find((f) => f.value === framework)?.label ?? framework
  return (
    <div className="flex items-center justify-between">
      <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
        {frameworkLabel} source
      </div>
      <a
        href={stackblitz}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite hover:text-ak-foam"
      >
        Run on StackBlitz →
      </a>
    </div>
  )
}
