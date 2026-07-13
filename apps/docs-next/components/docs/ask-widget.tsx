'use client'

import Link from 'next/link'
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from 'react'
import { createLocalStorageMemory, type ChatReturn, type Message as AgentsKitMessage } from '@agentskit/core'
import {
  SourceListPropsSchema,
  StandardComponentCatalog,
  defineChat,
  defineComponentManifest,
  type ComponentDefinition,
} from '@agentskit/chat'
import {
  AgentChat,
  StandardComponent as FrameworkStandardComponent,
  type AgentChatSlots,
  type StandardComponentProps,
} from '@agentskit/chat-react'
import { z } from 'zod'
import { AnimatedLogo } from '@/components/brand/animated-logo'
import { Markdown } from './ask/Markdown'
import { createAskAdapter, type AskAdapterOptions } from './ask/ask-adapter'
import { defaultRegistry, type UiToolContext, type UiToolRegistry } from './ask/registry'

const AskToolPropsSchema = z.object({
  name: z.enum(['answer', 'showOptions', 'renderForm', 'codeBlock', 'runExample', 'openPage']),
  args: z.record(z.string(), z.json()),
}).strict()

const AskToolComponent: ComponentDefinition<z.infer<typeof AskToolPropsSchema>> = {
  key: 'ask-tool',
  propsSchema: AskToolPropsSchema,
  accessibility: { role: 'group', keyboard: true, live: 'polite' },
  capabilities: ['display', 'selection', 'input', 'navigation'],
  fallback: props => `Interactive documentation content: ${props.name}.`,
}

const ASK_COMPONENTS = defineComponentManifest([...StandardComponentCatalog, AskToolComponent])

interface AskRuntime {
  readonly chat: { current: ChatReturn | null }
  readonly registry: UiToolRegistry
  readonly context: UiToolContext
  readonly emptyState: ReactNode
  readonly loadingState?: ReactNode
}

const AskRuntimeContext = createContext<AskRuntime | undefined>(undefined)

function useAskRuntime(): AskRuntime {
  const runtime = useContext(AskRuntimeContext)
  if (!runtime) throw new Error('Ask runtime is unavailable.')
  return runtime
}

function AskMessage({ message }: { message: AgentsKitMessage }) {
  return message.role === 'assistant' ? (
    <div data-ak-message="assistant" className="flex max-w-[92%] flex-col gap-1.5 self-start">
      <Markdown content={message.content} streaming={message.status === 'streaming'} />
    </div>
  ) : (
    <div data-ak-message="user" className="max-w-[85%] self-end rounded-lg rounded-br-sm bg-ak-blue/10 px-3 py-2 text-sm text-ak-foam">
      {message.content}
    </div>
  )
}

function AskContainer({ children }: { children: ReactNode }) {
  const runtime = useAskRuntime()
  return <div className="flex flex-col gap-3">{runtime.chat.current?.messages.length ? null : <div data-ak-empty="" className="mb-3 text-sm text-ak-graphite">{runtime.emptyState}</div>}{children}</div>
}

function AskThinking({ visible }: { visible: boolean }) {
  const runtime = useAskRuntime()
  if (!visible) return null
  if (runtime.loadingState) return <>{runtime.loadingState}</>
  return (
    <div data-ak-ask-loading className="flex items-center gap-2.5 px-1 py-2 text-ak-blue" aria-label="Searching the docs">
      <AnimatedLogo variant="nav" size={24} />
      <span className="ak-ai-shimmer font-mono text-[11px] uppercase tracking-wide">Searching the docs…</span>
    </div>
  )
}

function AskInput({ chat, placeholder, disabled }: ComponentProps<NonNullable<AgentChatSlots['Input']>>) {
  const runtime = useAskRuntime()
  runtime.chat.current = chat
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!disabled && chat.input.trim()) void chat.send(chat.input)
  }
  return (
    <form data-ak-composer="" className="flex gap-2" onSubmit={submit}>
      <textarea
        value={chat.input}
        onChange={event => chat.setInput(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            if (!disabled && chat.input.trim()) void chat.send(chat.input)
          }
        }}
        rows={2}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 resize-none rounded-md border border-ak-border bg-ak-surface p-2 font-mono text-xs text-ak-foam outline-none transition-colors focus:border-ak-blue"
      />
      {chat.status === 'streaming' ? (
        <button type="button" onClick={chat.stop} data-ak-stop="" className="rounded-md border border-ak-red/40 bg-ak-red/10 px-3 font-mono text-xs text-ak-red">stop</button>
      ) : (
        <button type="submit" disabled={!chat.input.trim()} data-ak-send="" className="rounded-md bg-ak-foam px-3 font-mono text-xs font-semibold text-ak-midnight disabled:opacity-40">send</button>
      )}
    </form>
  )
}

function AskStandardComponent(props: StandardComponentProps) {
  const runtime = useAskRuntime()
  if (props.frame.componentKey === 'source-list') {
    const parsed = SourceListPropsSchema.safeParse(props.frame.props)
    if (!parsed.success) return null
    return (
      <div data-ak-tool="cite" className="my-1">
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ak-graphite">{parsed.data.label}</div>
        <ul className="flex flex-col gap-1.5">
          {parsed.data.sources.map((source, index) => <li key={source.id}><a href={source.url} data-ak-citation="" className="group flex items-center gap-2 rounded-md border border-ak-border bg-ak-surface px-2.5 py-1.5 text-xs hover:border-ak-blue"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-ak-border font-mono text-[10px] text-ak-blue">{index + 1}</span><span className="truncate font-medium text-ak-foam">{source.title}</span></a></li>)}
        </ul>
      </div>
    )
  }
  if (props.frame.componentKey !== 'ask-tool') return <FrameworkStandardComponent {...props} />
  const parsed = AskToolPropsSchema.safeParse(props.frame.props)
  if (!parsed.success) return null
  return <div>{runtime.registry.render(parsed.data.name, parsed.data.args, { ...runtime.context, id: props.frame.instanceId })}</div>
}

export interface AskWidgetBrand {
  fabLabel?: ReactNode
  title?: ReactNode
  emptyState?: ReactNode
  placeholder?: string
  logo?: ReactNode
  docsHref?: string | null
  docsLabel?: ReactNode
}

export interface AskWidgetCta {
  label: ReactNode
  href: string
  target?: string
}

export interface AskDocsWidgetProps extends AskAdapterOptions {
  storageKey?: string
  brand?: AskWidgetBrand
  cta?: AskWidgetCta | null
  fabLabel?: ReactNode
  title?: ReactNode
  emptyState?: ReactNode
  placeholder?: string
  registry?: UiToolRegistry
  logo?: ReactNode
  loadingState?: ReactNode
  docsHref?: string | null
  docsLabel?: ReactNode
  defaultOpen?: boolean
}

export function AskDocsWidget({
  endpoint,
  corpus,
  persona,
  storageKey,
  brand,
  cta,
  fabLabel,
  title,
  emptyState,
  placeholder,
  registry = defaultRegistry,
  logo,
  loadingState,
  docsHref,
  docsLabel,
  defaultOpen = true,
}: AskDocsWidgetProps = {}) {
  const [open, setOpen] = useState(defaultOpen)
  const [localRuns, setLocalRuns] = useState<string[]>([])
  const chatRef = useRef<ChatReturn | null>(null)
  const effectiveFabLabel = fabLabel ?? brand?.fabLabel ?? 'Ask the docs'
  const effectiveTitle = title ?? brand?.title ?? 'Ask the docs'
  const effectiveEmptyState = emptyState ?? brand?.emptyState
  const effectiveLogo = logo ?? brand?.logo
  const effectivePlaceholder = placeholder ?? brand?.placeholder ?? 'Ask a question...'
  const effectiveDocsHref = docsHref === undefined ? (brand?.docsHref ?? '/docs/cookbook/ask-the-docs') : docsHref
  const effectiveDocsLabel = docsLabel ?? brand?.docsLabel ?? 'Build a chat like this - step by step ->'
  const askLabel = typeof effectiveFabLabel === 'string' ? effectiveFabLabel : 'Ask the docs'
  const definition = useMemo(() => defineChat({
    id: `docs-ask-${corpus ?? 'docs'}-${persona ?? 'default'}`,
    components: ASK_COMPONENTS,
    chat: {
      adapter: createAskAdapter({ endpoint, corpus, persona }),
      memory: createLocalStorageMemory(storageKey ?? `ak:ask-thread-v3:${corpus ?? 'docs'}:${persona ?? 'default'}`),
    },
  }), [endpoint, corpus, persona, storageKey])
  const runtime = useMemo<AskRuntime>(() => ({
    chat: chatRef,
    registry,
    emptyState: effectiveEmptyState ?? <>Ask anything about AgentsKit. Answers come from the docs corpus and cite their sources.</>,
    ...(loadingState === undefined ? {} : { loadingState }),
    context: {
      onSelect: value => void chatRef.current?.send(value),
      onSubmit: (action, values) => {
        const summary = Object.entries(values).filter(([, value]) => value !== '').map(([key, value]) => `${key}=${value}`).join(', ')
        void chatRef.current?.send(`${action}(${summary})`)
      },
      onRun: code => setLocalRuns(current => [...current, code]),
    },
  }), [effectiveEmptyState, loadingState, registry])

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} aria-label={askLabel} data-ak-ask-fab="" className="group fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-ak-border bg-ak-midnight px-4 py-2.5 font-mono text-xs font-semibold text-ak-foam shadow-lg">
      <span aria-hidden>{effectiveLogo ?? <AnimatedLogo variant="nav" size={16} />}</span>{effectiveFabLabel}
    </button>
  )

  return (
    <AskRuntimeContext.Provider value={runtime}>
      <div data-ak-ask-panel="" className="fixed bottom-4 right-4 z-50 flex h-[min(620px,82vh)] w-[min(440px,94vw)] flex-col overflow-hidden rounded-xl border border-ak-border bg-ak-midnight shadow-2xl">
        <header className="flex items-center justify-between border-b border-ak-border bg-gradient-to-br from-ak-surface to-ak-midnight px-4 py-2.5">
          <div className="flex items-center gap-2"><span aria-hidden>{effectiveLogo ?? <AnimatedLogo variant="nav" size={18} />}</span><span className="font-mono text-xs uppercase tracking-[0.2em] text-ak-graphite">{effectiveTitle}</span></div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void chatRef.current?.clear()} className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">clear</button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-ak-graphite">✕</button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-3">
          <AgentChat
            definition={definition}
            placeholder={effectivePlaceholder}
            slots={{ Container: AskContainer, Message: AskMessage, Input: AskInput, Thinking: AskThinking, StandardComponent: AskStandardComponent }}
          />
          {localRuns.map((code, index) => <div key={`${index}-${code.length}`}>{registry.render('runExample', { code }, { ...runtime.context, id: `local-run-${index}` })}</div>)}
        </div>
        <div className="border-t border-ak-border p-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
            {effectiveDocsHref ? <Link href={effectiveDocsHref} data-ak-ask-docs-link="" className="flex items-center gap-1.5 font-mono text-[10px] text-ak-graphite"><AnimatedLogo variant="nav" size={12} />{effectiveDocsLabel}</Link> : null}
            {cta ? <a href={cta.href} target={cta.target} rel={cta.target === '_blank' ? 'noreferrer' : undefined} data-ak-ask-cta="" className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ak-blue">{cta.label}</a> : null}
          </div>
        </div>
      </div>
    </AskRuntimeContext.Provider>
  )
}
