'use client'

import { useEffect, useMemo, useState } from 'react'

const STACK_KEY = 'ak:stack'
const FRAMEWORK_KEY = 'ak:framework'
const FRAMEWORK_EVENT = 'ak:framework-change'

type Framework = 'react' | 'vue' | 'svelte' | 'solid' | 'angular' | 'react-native' | 'ink' | 'node'
type Provider = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama'
type Memory = 'in-memory' | 'file' | 'sqlite' | 'redis'
type Capability = 'tools' | 'rag' | 'observability'

type Stack = {
  framework: Framework
  provider: Provider
  memory: Memory
  capabilities: Capability[]
}

const DEFAULT: Stack = {
  framework: 'react',
  provider: 'openai',
  memory: 'in-memory',
  capabilities: ['tools'],
}

const FRAMEWORKS: { value: Framework; label: string; pkg: string; hook: string }[] = [
  { value: 'react', label: 'React', pkg: '@agentskit/react', hook: 'useChat' },
  { value: 'vue', label: 'Vue', pkg: '@agentskit/vue', hook: 'useChat' },
  { value: 'svelte', label: 'Svelte', pkg: '@agentskit/svelte', hook: 'createChatStore' },
  { value: 'solid', label: 'Solid', pkg: '@agentskit/solid', hook: 'useChat' },
  { value: 'angular', label: 'Angular', pkg: '@agentskit/angular', hook: 'ChatState' },
  { value: 'react-native', label: 'React Native', pkg: '@agentskit/react-native', hook: 'useChat' },
  { value: 'ink', label: 'Ink (terminal)', pkg: '@agentskit/ink', hook: 'useChat' },
  { value: 'node', label: 'Node (no UI)', pkg: '@agentskit/runtime', hook: 'runtime.run' },
]

const PROVIDERS: { value: Provider; label: string; pkg: string; factory: string; model: string }[] = [
  { value: 'openai', label: 'OpenAI', pkg: '@agentskit/adapters/openai', factory: 'openai', model: 'gpt-4o-mini' },
  { value: 'anthropic', label: 'Anthropic', pkg: '@agentskit/adapters/anthropic', factory: 'anthropic', model: 'claude-sonnet-4-6' },
  { value: 'gemini', label: 'Gemini', pkg: '@agentskit/adapters/gemini', factory: 'gemini', model: 'gemini-2.5-flash' },
  { value: 'openrouter', label: 'OpenRouter (free tier)', pkg: '@agentskit/adapters/openrouter', factory: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free' },
  { value: 'ollama', label: 'Ollama (local)', pkg: '@agentskit/adapters/ollama', factory: 'ollama', model: 'llama3.1' },
]

const MEMORIES: { value: Memory; label: string; pkg: string; factory: string; args: string }[] = [
  { value: 'in-memory', label: 'In-memory (dev)', pkg: '@agentskit/memory', factory: 'inMemory', args: '()' },
  { value: 'file', label: 'File (JSON)', pkg: '@agentskit/memory/file', factory: 'fileMemory', args: `({ path: './threads.json' })` },
  { value: 'sqlite', label: 'SQLite', pkg: '@agentskit/memory/sqlite', factory: 'sqliteMemory', args: `({ path: './threads.db' })` },
  { value: 'redis', label: 'Redis', pkg: '@agentskit/memory/redis', factory: 'redisMemory', args: `({ url: process.env.REDIS_URL! })` },
]

const CAPABILITIES: { value: Capability; label: string; pkg: string }[] = [
  { value: 'tools', label: 'Tools (function calling)', pkg: '@agentskit/tools' },
  { value: 'rag', label: 'RAG (retrieval)', pkg: '@agentskit/rag' },
  { value: 'observability', label: 'Observability (traces)', pkg: '@agentskit/observability' },
]

function readStack(): Stack {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw = window.localStorage.getItem(STACK_KEY)
    if (!raw) return DEFAULT
    return { ...DEFAULT, ...JSON.parse(raw) }
  } catch {
    return DEFAULT
  }
}
function writeStack(s: Stack) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STACK_KEY, JSON.stringify(s))
}
function writeFramework(f: Framework) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FRAMEWORK_KEY, f)
  window.dispatchEvent(new CustomEvent(FRAMEWORK_EVENT))
}

function useStack(): [Stack, (partial: Partial<Stack>) => void] {
  const [stack, setStack] = useState<Stack>(DEFAULT)
  useEffect(() => {
    setStack(readStack())
  }, [])
  const update = (partial: Partial<Stack>) => {
    const next = { ...stack, ...partial }
    setStack(next)
    writeStack(next)
    if (partial.framework) writeFramework(partial.framework)
  }
  return [stack, update]
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
  const install = `pnpm add ${[...new Set(deps)].join(' ')}`

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
      ? `const clock = defineTool({
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
  const [stack, update] = useStack()
  const { install, code } = useMemo(() => buildSnippet(stack), [stack])
  const [copied, setCopied] = useState<'install' | 'code' | null>(null)

  const copy = (what: 'install' | 'code', text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(what)
    window.setTimeout(() => setCopied((c) => (c === what ? null : c)), 1200)
  }

  const toggleCap = (c: Capability) => {
    const has = stack.capabilities.includes(c)
    update({
      capabilities: has ? stack.capabilities.filter((x) => x !== c) : [...stack.capabilities, c],
    })
  }

  return (
    <div data-ak-stack-builder className="my-6 overflow-hidden rounded-lg border border-ak-border bg-ak-surface">
      <header className="border-b border-ak-border px-4 py-2">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-graphite">Stack builder</div>
      </header>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        <Field label="1. Framework">
          <Choice<Framework>
            options={FRAMEWORKS.map((f) => ({ value: f.value, label: f.label }))}
            value={stack.framework}
            onChange={(v) => update({ framework: v })}
          />
        </Field>
        <Field label="2. Provider">
          <Choice<Provider>
            options={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
            value={stack.provider}
            onChange={(v) => update({ provider: v })}
          />
        </Field>
        <Field label="3. Memory">
          <Choice<Memory>
            options={MEMORIES.map((m) => ({ value: m.value, label: m.label }))}
            value={stack.memory}
            onChange={(v) => update({ memory: v })}
          />
        </Field>
        <Field label="4. Capabilities">
          <div className="flex flex-wrap gap-2">
            {CAPABILITIES.map((c) => {
              const on = stack.capabilities.includes(c.value)
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleCap(c.value)}
                  className={`rounded border px-3 py-1 font-mono text-xs ${
                    on
                      ? 'border-ak-foam bg-ak-foam/15 text-white'
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
          <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">Install</div>
          <button
            type="button"
            onClick={() => copy('install', install)}
            className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite hover:text-ak-foam"
          >
            {copied === 'install' ? '✓ copied' : 'copy'}
          </button>
        </header>
        <pre className="overflow-x-auto rounded border border-ak-border bg-ak-midnight p-3 font-mono text-xs text-ak-foam">
          {install}
        </pre>
      </section>

      <section className="border-t border-ak-border p-4">
        <header className="mb-2 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">Starter code</div>
          <button
            type="button"
            onClick={() => copy('code', code)}
            className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite hover:text-ak-foam"
          >
            {copied === 'code' ? '✓ copied' : 'copy'}
          </button>
        </header>
        <pre className="overflow-x-auto rounded border border-ak-border bg-ak-midnight p-3 font-mono text-xs text-ak-foam">
          <code>{code}</code>
        </pre>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-ak-graphite">{label}</div>
      {children}
    </div>
  )
}

function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded border border-ak-border bg-ak-midnight px-3 py-2 font-mono text-xs text-ak-foam"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
