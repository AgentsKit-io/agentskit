'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FRAMEWORKS,
  PROVIDERS,
  MEMORIES,
  PACKAGE_MANAGERS,
  useFramework,
  useProvider,
  useMemory,
  usePackageManager,
  type Framework,
  type Provider,
  type Memory,
} from '@/lib/stack-state'

type Capability = 'tools' | 'rag' | 'observability'

type Stack = {
  framework: Framework
  provider: Provider
  memory: Memory
  capabilities: Capability[]
  packageManager: (typeof PACKAGE_MANAGERS)[number]['value']
}

const CAPABILITIES_KEY = 'ak:capabilities'
const DEFAULT_CAPABILITIES: Capability[] = ['tools']

const CAPABILITIES: { value: Capability; label: string; pkg: string }[] = [
  { value: 'tools', label: 'Tools (function calling)', pkg: '@agentskit/tools' },
  { value: 'rag', label: 'RAG (retrieval)', pkg: '@agentskit/rag' },
  { value: 'observability', label: 'Observability (traces)', pkg: '@agentskit/observability' },
]

function readCapabilities(): Capability[] {
  if (typeof window === 'undefined') return DEFAULT_CAPABILITIES
  try {
    const raw = window.localStorage.getItem(CAPABILITIES_KEY)
    if (!raw) return DEFAULT_CAPABILITIES
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Capability[]) : DEFAULT_CAPABILITIES
  } catch {
    return DEFAULT_CAPABILITIES
  }
}

function writeCapabilities(caps: Capability[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CAPABILITIES_KEY, JSON.stringify(caps))
}

function buildSnippet(stack: Stack): { install: string; code: string } {
  const fw = FRAMEWORKS.find((f) => f.value === stack.framework)!
  const prov = PROVIDERS.find((p) => p.value === stack.provider)!
  const mem = MEMORIES.find((m) => m.value === stack.memory)!
  const capPkgs = stack.capabilities.map((c) => CAPABILITIES.find((x) => x.value === c)!.pkg)

  const deps = [
    '@agentskit/core',
    fw.pkg,
    prov.pkg.split('/').slice(0, 2).join('/'),
    mem.pkg.split('/').slice(0, 2).join('/'),
    ...capPkgs,
  ]
  const pm = PACKAGE_MANAGERS.find((p) => p.value === stack.packageManager) ?? PACKAGE_MANAGERS[0]
  const install = `${pm.add} ${[...new Set(deps)].join(' ')}`

  const hasTools = stack.capabilities.includes('tools')
  const hasObservability = stack.capabilities.includes('observability')
  const hasRag = stack.capabilities.includes('rag')

  const imports = [
    `import { ${fw.hook} } from '${fw.pkg}'`,
    `import { ${prov.factory} } from '${prov.pkg}'`,
    `import { ${mem.factory} } from '${mem.pkg}'`,
    ...(hasTools ? [`import { defineTool } from '@agentskit/tools'`] : []),
    ...(hasObservability ? [`import { tracer } from '@agentskit/observability'`] : []),
    ...(hasRag ? [`import { createRAG } from '@agentskit/rag'`] : []),
  ].join('\n')

  const setup = [
    `const adapter = ${prov.factory}({ model: '${prov.model}' })`,
    `const memory = ${mem.factory}${mem.args}`,
    hasTools
      ? `// One example tool. @agentskit/tools also ships web-search, fetch, shell,
// filesystem, MCP, plus 25+ ready-made integrations (Slack, GitHub, Linear,
// Stripe, Postgres, weather, maps, browser-agent, …).
const clock = defineTool({
  name: 'get_time',
  description: 'Current server time',
  schema: {},
  execute: () => ({ time: new Date().toISOString() }),
})`
      : '',
    hasObservability ? `tracer.enable()` : '',
    hasRag
      ? `const rag = createRAG({ embed: { model: 'text-embedding-3-small' } })
await rag.ingest()`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const usage =
    stack.framework === 'node'
      ? `import { createRuntime } from '@agentskit/runtime'

const runtime = createRuntime({
  adapter,
  memory,${hasTools ? '\n  tools: [clock],' : ''}${hasRag ? '\n  retriever: rag.retriever,' : ''}
})

const result = await runtime.run('Hello, agent')
console.log(result.content)`
      : `// inside a component
const { messages, input, setInput, send } = ${fw.hook}({
  adapter,
  memory,${hasTools ? '\n  tools: [clock],' : ''}${hasRag ? '\n  retriever: rag.retriever,' : ''}
})`

  return { install, code: `${imports}\n\n${setup}\n\n${usage}`.trim() }
}

export function StackBuilder() {
  const [framework, setFramework] = useFramework()
  const [provider, setProvider] = useProvider()
  const [memory, setMemory] = useMemory()
  const [packageManager, setPackageManager] = usePackageManager()
  const [capabilities, setCapabilities] = useState<Capability[]>(DEFAULT_CAPABILITIES)

  useEffect(() => {
    setCapabilities(readCapabilities())
  }, [])

  const stack: Stack = { framework, provider, memory, capabilities, packageManager }
  const { install, code } = useMemo(() => buildSnippet(stack), [framework, provider, memory, capabilities, packageManager])
  const [copied, setCopied] = useState<'install' | 'code' | null>(null)

  const copy = (what: 'install' | 'code', text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(what)
    window.setTimeout(() => setCopied((c) => (c === what ? null : c)), 1200)
  }

  const toggleCap = (c: Capability) => {
    const has = capabilities.includes(c)
    const next = has ? capabilities.filter((x) => x !== c) : [...capabilities, c]
    setCapabilities(next)
    writeCapabilities(next)
  }

  return (
    <div data-ak-stack-builder className="my-6 overflow-hidden rounded-lg border border-ak-border bg-ak-surface">
      <header className="flex items-center justify-between border-b border-ak-border px-4 py-2">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-graphite">Stack builder</div>
        <label htmlFor="stack-package-manager" className="sr-only">Package manager</label>
        <select
          id="stack-package-manager"
          value={packageManager}
          onChange={(e) => setPackageManager(e.target.value as typeof packageManager)}
          className="min-h-11 rounded border border-ak-border bg-ak-midnight px-3 py-2 font-mono text-xs uppercase tracking-widest text-ak-graphite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue"
        >
          {PACKAGE_MANAGERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </header>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        <Field label="1. Framework" htmlFor="stack-framework">
          <Choice<Framework>
            id="stack-framework"
            options={FRAMEWORKS.map((f) => ({ value: f.value, label: f.label }))}
            value={framework}
            onChange={setFramework}
          />
        </Field>
        <Field label="2. Provider" htmlFor="stack-provider">
          <Choice<Provider>
            id="stack-provider"
            options={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
            value={provider}
            onChange={setProvider}
          />
        </Field>
        <Field label="3. Memory" htmlFor="stack-memory">
          <Choice<Memory>
            id="stack-memory"
            options={MEMORIES.map((m) => ({ value: m.value, label: m.label }))}
            value={memory}
            onChange={setMemory}
          />
        </Field>
        <Field label="4. Capabilities">
          <div className="flex flex-wrap gap-2">
            {CAPABILITIES.map((c) => {
              const on = capabilities.includes(c.value)
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleCap(c.value)}
                  className={`min-h-11 rounded border px-3 py-2 font-mono text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue ${
                    on
                      ? 'border-ak-foam bg-ak-foam/15 text-ak-foam'
                      : 'border-ak-border bg-ak-midnight text-ak-graphite hover:text-ak-foam'
                  }`}
                >
                  {on ? '✓ ' : ''}{c.label}
                </button>
              )
            })}
          </div>
        </Field>
      </div>

      <section className="border-t border-ak-border p-4">
        <header className="mb-2 flex items-center justify-between">
          <div className="font-mono text-xs uppercase tracking-widest text-ak-graphite">Install</div>
          <button
            type="button"
            onClick={() => copy('install', install)}
            className="min-h-11 rounded px-2 font-mono text-xs uppercase tracking-widest text-ak-graphite hover:text-ak-foam focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue"
          >
            {copied === 'install' ? '✓ copied' : 'copy'}
          </button>
        </header>
        <CodeOutput code={install} label="Install command" />
      </section>

      <section className="border-t border-ak-border p-4">
        <header className="mb-2 flex items-center justify-between">
          <div className="font-mono text-xs uppercase tracking-widest text-ak-graphite">Starter code</div>
          <button
            type="button"
            onClick={() => copy('code', code)}
            className="min-h-11 rounded px-2 font-mono text-xs uppercase tracking-widest text-ak-graphite hover:text-ak-foam focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue"
          >
            {copied === 'code' ? '✓ copied' : 'copy'}
          </button>
        </header>
        <CodeOutput code={code} label="Generated starter code" />
      </section>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block font-mono text-xs uppercase tracking-widest text-ak-graphite">
        {label}
      </label>
      {children}
    </div>
  )
}

function Choice<T extends string>({
  id,
  options,
  value,
  onChange,
}: {
  id: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="min-h-11 w-full rounded border border-ak-border bg-ak-midnight px-3 py-2 font-mono text-xs text-ak-foam focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function CodeOutput({ code, label }: { code: string; label: string }) {
  return (
    <pre
      aria-label={label}
      className="max-h-[32rem] overflow-auto rounded-md border border-ak-border bg-ak-midnight p-4 font-mono text-sm leading-relaxed text-ak-foam"
    >
      <code>{code}</code>
    </pre>
  )
}
