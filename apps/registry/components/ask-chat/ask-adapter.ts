import { deserializeMessages, serializeMessages, type AdapterFactory, type ChatMemory, type Message, type StreamChunk } from '@agentskit/core'
import { createAssistantContentEncoder, decodeAssistantContent, type ComponentRenderFrame } from '@agentskit/chat-protocol'
import { z } from 'zod'

const AskEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), delta: z.string() }).strict(),
  z.object({ type: z.literal('tool'), id: z.string(), name: z.string(), args: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ type: z.literal('done'), model: z.string().optional() }).strict(),
  z.object({ type: z.literal('error'), message: z.string() }).strict(),
])

export type AskEvent = z.infer<typeof AskEventSchema>
export interface AskAdapterOptions { readonly endpoint?: string; readonly corpus: string }
export interface AskMemoryOptions { readonly key: string; readonly legacyKeys?: readonly string[]; readonly maxMessages?: number }

function endpointWithCorpus(endpoint: string, corpus: string): string {
  const relative = endpoint.startsWith('/')
  const url = new URL(endpoint, typeof window === 'undefined' ? 'https://registry.agentskit.io' : window.location.origin)
  url.searchParams.set('corpus', corpus)
  return relative ? `${url.pathname}${url.search}${url.hash}` : url.toString()
}

export function decodeAskEvents(buffer: string): { readonly events: readonly AskEvent[]; readonly rest: string } {
  const lines = buffer.split('\n')
  const rest = lines.pop() ?? ''
  const events = lines.flatMap((line): AskEvent[] => {
    const value = line.trim()
    if (value === '' || value.length > 1_048_576) return []
    try {
      const parsed = AskEventSchema.safeParse(JSON.parse(value))
      return parsed.success ? [parsed.data] : []
    } catch { return [] }
  })
  return { events, rest: rest.length <= 1_048_576 ? rest : '' }
}

function safeHref(path: string, anchor?: string): string | undefined {
  const suffix = anchor ? `#${encodeURIComponent(anchor.replace(/^#/, ''))}` : ''
  if (path.startsWith('/') && !path.startsWith('//')) return `${path}${suffix}`
  try {
    const url = new URL(path)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    if (anchor) url.hash = encodeURIComponent(anchor.replace(/^#/, ''))
    return url.toString()
  } catch { return undefined }
}

function sourceListFrame(event: Extract<AskEvent, { type: 'tool' }>): ComponentRenderFrame | undefined {
  if (!Array.isArray(event.args.sources)) return undefined
  const sources = event.args.sources.flatMap((candidate, index) => {
    if (typeof candidate !== 'object' || candidate === null) return []
    const source = candidate as Record<string, unknown>
    if (typeof source.title !== 'string' || typeof source.path !== 'string') return []
    const url = safeHref(source.path, typeof source.anchor === 'string' ? source.anchor : undefined)
    return url ? [{ id: `source-${index + 1}`, title: source.title.slice(0, 256), url }] : []
  }).slice(0, 50)
  if (sources.length === 0) return undefined
  const instanceId = event.id.replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 128)
  return {
    protocol: 'agentskit.chat.component', version: 1, type: 'render', componentKey: 'source-list',
    instanceId: /^[A-Za-z0-9]/.test(instanceId) ? instanceId : 'sources',
    props: { label: 'Sources', sources },
    fallback: { kind: 'source-list', summary: `Sources: ${sources.map(source => source.title).join(', ')}.`.slice(0, 4_096) },
  }
}

export function projectAskEvent(event: AskEvent):
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'component'; readonly frame: ComponentRenderFrame }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'done' }
  | undefined {
  if (event.type === 'text') return event.delta ? { kind: 'text', text: event.delta } : undefined
  if (event.type === 'error') return { kind: 'error', message: event.message }
  if (event.type === 'done') return { kind: 'done' }
  if (event.name === 'answer' && typeof event.args.markdown === 'string') return event.args.markdown ? { kind: 'text', text: event.args.markdown } : undefined
  if (event.name !== 'cite') return undefined
  const frame = sourceListFrame(event)
  return frame ? { kind: 'component', frame } : undefined
}

function wireMessages(messages: readonly Message[]): Array<{ readonly role: 'user' | 'assistant'; readonly content: string }> {
  const projected: Array<{ readonly role: 'user' | 'assistant'; readonly content: string }> = []
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue
    if (message.role === 'user') { projected.push({ role: message.role, content: message.content }); continue }
    const decoded = decodeAssistantContent(message.content)
    projected.push({ role: message.role, content: decoded.ok ? decoded.parts.map(part => part.kind === 'text' ? part.text : `[${part.frame.componentKey}]`).join('\n').trim() : message.content })
  }
  return projected
}

function parseStoredMessages(raw: string): Message[] {
  const value: unknown = JSON.parse(raw)
  try {
    const messages = deserializeMessages(value as Parameters<typeof deserializeMessages>[0])
    if (messages.length > 0 || (Array.isArray(value) && value.length === 0)) return messages
  } catch {}
  {
    if (!Array.isArray(value)) return []
    const createdAt = new Date()
    return value.flatMap((candidate, index): Message[] => {
      if (typeof candidate !== 'object' || candidate === null) return []
      const record = candidate as Record<string, unknown>
      if (record.role !== 'user' && record.role !== 'assistant') return []
      const content = typeof record.content === 'string' ? record.content : typeof record.text === 'string' ? record.text : undefined
      return content === undefined ? [] : [{ id: typeof record.id === 'string' && record.id ? record.id : `legacy-${index + 1}`, role: record.role, content, status: 'complete', createdAt }]
    })
  }
}

export function createAskAdapter({ endpoint = 'https://ask.agentskit.io/v1/ask', corpus }: AskAdapterOptions): AdapterFactory {
  return {
    capabilities: { streaming: true, structuredOutput: true },
    createSource(request) {
      const controller = new AbortController()
      return {
        abort: () => controller.abort(),
        async *stream(): AsyncIterableIterator<StreamChunk> {
          const encoder = createAssistantContentEncoder()
          try {
            const response = await fetch(endpointWithCorpus(endpoint, corpus), {
              method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45_000)]),
              headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: wireMessages(request.messages) }),
            })
            if (!response.ok || !response.body) throw new Error(`Ask request failed (${response.status}).`)
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let mode: 'unknown' | 'ndjson' | 'text' = 'unknown'
            while (true) {
              const read = await reader.read()
              buffer += decoder.decode(read.value, { stream: !read.done })
              if (mode === 'unknown' && buffer.trimStart()) mode = buffer.trimStart().startsWith('{') ? 'ndjson' : 'text'
              if (mode === 'text') {
                while (buffer) { const text = buffer.slice(0, 16_384); buffer = buffer.slice(text.length); yield { type: 'text', content: encoder.encode({ kind: 'text', text }) } }
                if (read.done) break
                continue
              }
              const decoded = decodeAskEvents(read.done ? `${buffer}\n` : buffer)
              buffer = decoded.rest
              for (const event of decoded.events) {
                const projected = projectAskEvent(event)
                if (!projected) continue
                if (projected.kind === 'error') { yield { type: 'error', content: projected.message }; return }
                if (projected.kind === 'done') { yield { type: 'done' }; return }
                if (projected.kind === 'component') { yield { type: 'text', content: encoder.encode({ kind: 'component', frame: projected.frame }) }; continue }
                for (let offset = 0; offset < projected.text.length; offset += 16_384) yield { type: 'text', content: encoder.encode({ kind: 'text', text: projected.text.slice(offset, offset + 16_384) }) }
              }
              if (read.done) break
            }
            yield { type: 'done' }
          } catch (error) {
            if (!controller.signal.aborted) yield { type: 'error', content: error instanceof Error ? error.message : 'Ask request failed.' }
          }
        },
      }
    },
  }
}

export function createAskSessionMemory({ key, legacyKeys = [], maxMessages = 20 }: AskMemoryOptions): ChatMemory {
  return {
    async load() {
      if (typeof sessionStorage === 'undefined') return []
      for (const candidateKey of [key, ...legacyKeys]) {
        const raw = sessionStorage.getItem(candidateKey)
        if (!raw) continue
        try {
          const messages = parseStoredMessages(raw).slice(-maxMessages)
          sessionStorage.setItem(key, JSON.stringify(serializeMessages(messages)))
          if (candidateKey !== key) sessionStorage.removeItem(candidateKey)
          return messages
        } catch { if (candidateKey === key) sessionStorage.removeItem(candidateKey) }
      }
      return []
    },
    async save(messages) { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, JSON.stringify(serializeMessages(messages.slice(-maxMessages)))) },
    async clear() { if (typeof sessionStorage !== 'undefined') for (const candidateKey of [key, ...legacyKeys]) sessionStorage.removeItem(candidateKey) },
  }
}
