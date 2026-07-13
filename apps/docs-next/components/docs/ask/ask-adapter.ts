import type { AdapterFactory, Message, StreamChunk } from '@agentskit/core'
import {
  createAssistantContentEncoder,
  decodeAssistantContent,
  type ComponentRenderFrame,
} from '@agentskit/chat-protocol'
import { decodeEvents, RENDERABLE_TOOL_NAMES, type UiEvent } from '../../../lib/ask/protocol'

const DEFAULT_ENDPOINT = process.env.NEXT_PUBLIC_ASK_ENDPOINT || '/api/ask-docs'

export interface AskAdapterOptions {
  endpoint?: string
  corpus?: string
  persona?: string
}

interface CitedSource {
  title: string
  path: string
  anchor?: string
}

function endpointWithParams(options: AskAdapterOptions): string {
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT
  const params = Object.entries({ corpus: options.corpus, persona: options.persona }).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim() !== '',
  )
  if (params.length === 0) return endpoint
  const relative = endpoint.startsWith('/')
  const base = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  const url = new URL(endpoint, base)
  for (const [key, value] of params) url.searchParams.set(key, value)
  return relative ? `${url.pathname}${url.search}${url.hash}` : url.toString()
}

function safeId(value: string, fallback: string): string {
  const normalized = value.replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 128)
  return /^[A-Za-z0-9]/.test(normalized) ? normalized : fallback
}

function citedSources(args: Record<string, unknown>): CitedSource[] {
  if (!Array.isArray(args.sources)) return []
  return args.sources.flatMap((source): CitedSource[] => {
    if (typeof source !== 'object' || source === null) return []
    const record = source as Record<string, unknown>
    if (typeof record.title !== 'string' || typeof record.path !== 'string') return []
    return [{
      title: record.title,
      path: record.path,
      ...(typeof record.anchor === 'string' ? { anchor: record.anchor } : {}),
    }]
  }).slice(0, 50)
}

function sourceListFrame(event: Extract<UiEvent, { type: 'tool' }>): ComponentRenderFrame | undefined {
  const sources = citedSources(event.args)
  if (sources.length === 0) return undefined
  return {
    protocol: 'agentskit.chat.component',
    version: 1,
    type: 'render',
    componentKey: 'source-list',
    instanceId: safeId(event.id, 'sources'),
    props: {
      label: 'Sources',
      sources: sources.map((source, index) => ({
        id: `source-${index + 1}`,
        title: source.title.slice(0, 256),
        url: `${source.path.startsWith('/') ? source.path : `/${source.path}`}${source.anchor ? `#${source.anchor}` : ''}`,
      })),
    },
    fallback: { kind: 'source-list', summary: `Sources: ${sources.map(source => source.title).join(', ').slice(0, 4_087)}.` },
  }
}

function applicationToolFrame(event: Extract<UiEvent, { type: 'tool' }>): ComponentRenderFrame {
  return {
    protocol: 'agentskit.chat.component',
    version: 1,
    type: 'render',
    componentKey: 'ask-tool',
    instanceId: safeId(event.id, `ask-${event.name}`),
    props: { name: event.name, args: event.args },
    fallback: { kind: 'ask-tool', summary: `Interactive documentation content: ${event.name}.` },
  }
}

export function projectAskEvent(event: UiEvent): { part?: { kind: 'text'; text: string } | { kind: 'component'; frame: ComponentRenderFrame }; error?: string; done?: boolean } {
  if (event.type === 'text') return event.delta === '' ? {} : { part: { kind: 'text', text: event.delta } }
  if (event.type === 'error') return { error: event.message }
  if (event.type === 'done') return { done: true }
  if (event.name === 'answer' && typeof event.args.markdown === 'string') {
    return event.args.markdown === '' ? {} : { part: { kind: 'text', text: event.args.markdown } }
  }
  if (event.name === 'cite') {
    const frame = sourceListFrame(event)
    return frame ? { part: { kind: 'component', frame } } : {}
  }
  return RENDERABLE_TOOL_NAMES.has(event.name)
    ? { part: { kind: 'component', frame: applicationToolFrame(event) } }
    : {}
}

function wireMessages(messages: readonly Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  const projected: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue
    if (message.role === 'user') {
      projected.push({ role: message.role, content: message.content })
      continue
    }
    const decoded = decodeAssistantContent(message.content)
    if (!decoded.ok) {
      projected.push({ role: message.role, content: message.content })
      continue
    }
    const content = decoded.parts.map(part => part.kind === 'text' ? part.text : `[${part.frame.componentKey}]`).join('\n').trim()
    projected.push({ role: message.role, content })
  }
  return projected
}

export function createAskAdapter(options: AskAdapterOptions = {}): AdapterFactory {
  return {
    capabilities: { streaming: true, structuredOutput: true },
    createSource(request) {
      const controller = new AbortController()
      return {
        abort: () => controller.abort(),
        async *stream(): AsyncIterableIterator<StreamChunk> {
          const content = createAssistantContentEncoder()
          try {
            const response = await fetch(endpointWithParams(options), {
              method: 'POST',
              signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]),
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ messages: wireMessages(request.messages) }),
            })
            if (!response.ok || !response.body) throw new Error(`Ask request failed (${response.status}).`)

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let mode: 'unknown' | 'ndjson' | 'text' = 'unknown'
            while (true) {
              const read = await reader.read()
              buffer += decoder.decode(read.value, { stream: !read.done })
              if (mode === 'unknown' && buffer.trimStart() !== '') mode = buffer.trimStart().startsWith('{') ? 'ndjson' : 'text'
              if (mode === 'text') {
                while (buffer.length > 0) {
                  const text = buffer.slice(0, 16_384)
                  buffer = buffer.slice(text.length)
                  yield { type: 'text', content: content.encode({ kind: 'text', text }) }
                }
                if (read.done) break
                continue
              }
              const decoded = decodeEvents(read.done ? `${buffer}\n` : buffer)
              buffer = decoded.rest
              for (const event of decoded.events) {
                const projected = projectAskEvent(event)
                if (projected.error) {
                  yield { type: 'error', content: projected.error }
                  return
                }
                if (projected.part?.kind === 'text') {
                  for (let offset = 0; offset < projected.part.text.length; offset += 16_384) {
                    yield { type: 'text', content: content.encode({ kind: 'text', text: projected.part.text.slice(offset, offset + 16_384) }) }
                  }
                } else if (projected.part) {
                  yield { type: 'text', content: content.encode(projected.part) }
                }
                if (projected.done) {
                  yield { type: 'done' }
                  return
                }
              }
              if (read.done) break
            }
            yield { type: 'done' }
          } catch (error) {
            if (!controller.signal.aborted) {
              yield { type: 'error', content: error instanceof Error ? error.message : 'Ask request failed.' }
            }
          }
        },
      }
    },
  }
}
