import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { STEPS } from '@/lib/learn-steps'
import { Stepper, MarkStepDone } from '@/components/learn/stepper'
import { ChatPreview } from '@/components/learn/chat-preview'
import { ToolsPreview, TOOLS_SOURCE } from '@/components/learn/tools-preview'
import {
  PackageManagerBlock,
  ProviderBlock,
  MemoryBlock,
} from '@/components/learn/selector-tabs'
import { canonicalUrl } from '@/lib/canonical-url'

export function generateStaticParams() {
  return STEPS.map((s) => ({ step: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params
  const s = STEPS.find((x) => x.slug === step)
  if (!s) return { title: 'Learn AgentsKit' }
  return {
    title: `${s.title} — Learn AgentsKit`,
    description: s.intro,
    alternates: { canonical: canonicalUrl(`/learn/${step}`) },
  }
}

function renderBody(body: string) {
  const blocks: { type: 'code' | 'text'; lang?: string; text: string }[] = []
  const re = /```(\w+)?\n([\s\S]*?)```/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    if (m.index > last) blocks.push({ type: 'text', text: body.slice(last, m.index) })
    blocks.push({ type: 'code', lang: m[1] ?? 'text', text: m[2] })
    last = m.index + m[0].length
  }
  if (last < body.length) blocks.push({ type: 'text', text: body.slice(last) })
  return blocks.map((b, i) =>
    b.type === 'code' ? (
      <div key={i} className="my-4">
        <DynamicCodeBlock lang={b.lang ?? 'text'} code={b.text.replace(/\n$/, '')} />
      </div>
    ) : (
      <p key={i} className="my-3 whitespace-pre-wrap text-ak-graphite">
        {b.text.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith('**') ? (
            <strong key={j} className="text-ak-foam">
              {part.slice(2, -2)}
            </strong>
          ) : (
            part
          ),
        )}
      </p>
    ),
  )
}

export default async function StepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params
  const s = STEPS.find((x) => x.slug === step)
  if (!s) notFound()
  const idx = STEPS.indexOf(s)
  const prev = STEPS[idx - 1]
  const next = STEPS[idx + 1]

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-10 md:flex-row">
        <Stepper activeSlug={s.slug} />
        <article className="flex-1">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-foam">
            Step {idx + 1} / {STEPS.length}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ak-foam">{s.title}</h1>
          <p className="mt-3 text-lg text-ak-graphite">{s.intro}</p>
          <div className="mt-6">{renderBody(s.body)}</div>

          {s.kind === 'install' ? (
            <div className="mt-8">
              <PackageManagerBlock packages="@agentskit/react @agentskit/core" />
            </div>
          ) : null}

          {s.kind === 'adapter' ? (
            <div className="mt-8">
              <ProviderBlock />
            </div>
          ) : null}

          {s.kind === 'memory' ? (
            <div className="mt-8">
              <MemoryBlock />
            </div>
          ) : null}

          {s.kind === 'chat' ? (
            <div className="mt-8">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
                Try it live
              </div>
              <ChatPreview />
              {s.files ? (
                <div className="mt-4">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
                    Source
                  </div>
                  <DynamicCodeBlock lang="tsx" code={s.files[s.entry ?? '/App.tsx'] ?? ''} />
                </div>
              ) : null}
            </div>
          ) : null}

          {s.kind === 'tools' ? (
            <div className="mt-8">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
                Try it live — pick a tool
              </div>
              <ToolsPreview />
              <div className="mt-4">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
                  Source — how to build this
                </div>
                <DynamicCodeBlock lang="tsx" code={TOOLS_SOURCE} />
              </div>
            </div>
          ) : null}

          <div className="mt-10 flex items-center justify-between gap-4 border-t border-ak-border pt-6">
            {prev ? (
              <Link
                href={`/learn/${prev.slug}`}
                className="text-sm text-ak-graphite hover:text-ak-foam"
              >
                ← {prev.title}
              </Link>
            ) : (
              <span />
            )}
            <MarkStepDone stepKey={s.key} />
            {next ? (
              <Link
                href={`/learn/${next.slug}`}
                className="text-sm font-semibold text-ak-foam hover:text-ak-foam"
              >
                {next.title} →
              </Link>
            ) : (
              <Link href="/docs" className="text-sm font-semibold text-ak-foam hover:text-ak-foam">
                Read the docs →
              </Link>
            )}
          </div>
        </article>
      </div>
    </main>
  )
}
