import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AdapterFactory, StreamChunk } from '@agentskit/core'

/**
 * Contract test harness from ADR 0001 — runs invariants A1–A10 against any
 * adapter that goes through `globalThis.fetch`. Bring your own fetch stub:
 * for OpenAI-compatible adapters, return an SSE body with a `[DONE]`
 * sentinel; for Anthropic-style, return its event stream; etc.
 *
 * Adapters that don't use the global fetch (bedrock, replicate, langchain,
 * vercel-ai) need their own per-adapter test files — this harness skips
 * them.
 */
export interface ContractStubResponse {
  /** Raw body of the streaming response. Will be passed back as `Response.body`. */
  body: string | Uint8Array | ReadableStream<Uint8Array>
  status?: number
  contentType?: string
}

export interface ContractAdapterCase {
  name: string
  /** Construct the adapter under test. */
  build(): AdapterFactory
  /** Provider-shaped success body. */
  successBody(): ContractStubResponse
}

function bodyToBytes(body: string | Uint8Array | ReadableStream<Uint8Array>): Uint8Array {
  if (body instanceof ReadableStream) {
    throw new Error('contract harness: successBody must be string|Uint8Array for delayed streams')
  }
  return typeof body === 'string' ? new TextEncoder().encode(body) : body
}

function bodyToStream(body: string | Uint8Array | ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  if (body instanceof ReadableStream) return body
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
}

/**
 * Deliver body in small pieces, honouring AbortSignal so mid-stream abort
 * is observable (instant full-body responses race past abort).
 */
function delayedAbortableStream(
  body: string | Uint8Array,
  signal: AbortSignal | undefined,
  chunkSize = 16,
  delayMs = 5,
): ReadableStream<Uint8Array> {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body
  let offset = 0
  return new ReadableStream({
    async pull(controller) {
      if (signal?.aborted) {
        controller.close()
        return
      }
      if (offset >= bytes.length) {
        controller.close()
        return
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, delayMs)
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            resolve()
          },
          { once: true },
        )
      })
      if (signal?.aborted) {
        controller.close()
        return
      }
      const next = bytes.subarray(offset, offset + chunkSize)
      offset += next.length
      controller.enqueue(next)
    },
  })
}

function mockSuccess(stub: ContractStubResponse): typeof globalThis.fetch {
  return vi.fn(async () => new Response(bodyToStream(stub.body), {
    status: stub.status ?? 200,
    headers: { 'content-type': stub.contentType ?? 'text/event-stream' },
  })) as unknown as typeof globalThis.fetch
}

function mockFailure(): typeof globalThis.fetch {
  return vi.fn(async () => new Response('upstream broke', { status: 500 })) as unknown as typeof globalThis.fetch
}

function userMessage(content: string) {
  return {
    id: 'u1',
    role: 'user' as const,
    content,
    status: 'complete' as const,
    createdAt: new Date(0),
  }
}

async function drain(factory: AdapterFactory): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const chunk of factory.createSource({ messages: [userMessage('hi')] }).stream()) {
    out.push(chunk)
  }
  return out
}

function isTerminal(chunk: StreamChunk | undefined): boolean {
  return chunk?.type === 'done' || chunk?.type === 'error'
}

/**
 * Run the ADR 0001 contract suite against one adapter. Call from a
 * `describe(...)` so vitest's `beforeEach` / `afterEach` scope correctly.
 */
export function runAdapterContract(adapterCase: ContractAdapterCase): void {
  describe(`adapter contract — ${adapterCase.name}`, () => {
    let originalFetch: typeof globalThis.fetch
    beforeEach(() => { originalFetch = globalThis.fetch })
    afterEach(() => { globalThis.fetch = originalFetch })

    it('A1: createSource is synchronous and does not fetch eagerly', () => {
      const fetchSpy = vi.fn() as unknown as typeof globalThis.fetch
      globalThis.fetch = fetchSpy
      const factory = adapterCase.build()
      const source = factory.createSource({ messages: [userMessage('hi')] })
      expect(source).toBeDefined()
      expect(source.stream).toBeTypeOf('function')
      expect(source.abort).toBeTypeOf('function')
      expect((fetchSpy as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(0)
    })

    it('A3 + A4: stream ends with exactly one terminal chunk (done or error)', async () => {
      globalThis.fetch = mockSuccess(adapterCase.successBody())
      const out = await drain(adapterCase.build())
      const terminals = out.filter(c => c.type === 'done' || c.type === 'error')
      expect(terminals).toHaveLength(1)
      expect(isTerminal(out[out.length - 1])).toBe(true)
    })

    it('A6: abort is safe before stream() is called', () => {
      globalThis.fetch = mockSuccess(adapterCase.successBody())
      const source = adapterCase.build().createSource({ messages: [userMessage('hi')] })
      expect(() => source.abort()).not.toThrow()
    })

    it('A6: abort is safe after stream() completes', async () => {
      globalThis.fetch = mockSuccess(adapterCase.successBody())
      const source = adapterCase.build().createSource({ messages: [userMessage('hi')] })
      for await (const _ of source.stream()) { /* drain */ void _ }
      expect(() => source.abort()).not.toThrow()
    })

    it('A6: mid-stream abort stops further chunks', async () => {
      const stub = adapterCase.successBody()
      const raw = stub.body
      if (raw instanceof ReadableStream) {
        // Skip exotic bodies; all stock cases use string bodies.
        return
      }
      globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        return new Response(delayedAbortableStream(raw, init?.signal), {
          status: stub.status ?? 200,
          headers: { 'content-type': stub.contentType ?? 'text/event-stream' },
        })
      }) as unknown as typeof globalThis.fetch

      const source = adapterCase.build().createSource({ messages: [userMessage('hi')] })
      const iter = source.stream()[Symbol.asyncIterator]()
      const first = await iter.next()
      // May or may not have decoded a full SSE frame yet; either way, abort.
      void first
      source.abort()
      const afterAbort: StreamChunk[] = []
      while (true) {
        const next = await iter.next()
        if (next.done) break
        afterAbort.push(next.value)
      }
      expect(afterAbort).toEqual([])
    })

    it('A7: input messages are not mutated', async () => {
      globalThis.fetch = mockSuccess(adapterCase.successBody())
      const messages = [userMessage('hi')]
      const snapshot = JSON.stringify(messages)
      for await (const _ of adapterCase.build().createSource({ messages }).stream()) { void _ }
      expect(JSON.stringify(messages)).toBe(snapshot)
    })

    it('A9: upstream failure yields exactly one error chunk with metadata.error', async () => {
      globalThis.fetch = mockFailure()
      const out: StreamChunk[] = []
      // Must not throw — caller drains, contract says no rejection here.
      let rejected: unknown
      try {
        for await (const chunk of adapterCase.build().createSource({ messages: [userMessage('hi')] }).stream()) {
          out.push(chunk)
        }
      } catch (err) {
        rejected = err
      }
      expect(rejected).toBeUndefined()

      const terminals = out.filter(c => c.type === 'done' || c.type === 'error')
      expect(terminals).toHaveLength(1)
      expect(terminals[0]!.type).toBe('error')
      expect(terminals[0]!.metadata?.error).toBeInstanceOf(Error)
      expect(out.some(c => c.type === 'done')).toBe(false)
    })
  })
}

// ---------------------------------------------------------------------------
// Stock provider response bodies
// ---------------------------------------------------------------------------

/** Minimal OpenAI-compatible SSE stream: one text delta, one DONE sentinel. */
export function openAISuccessBody(): ContractStubResponse {
  return {
    body:
      `data: {"choices":[{"delta":{"content":"hi"}}]}\n\n` +
      `data: [DONE]\n\n`,
  }
}

/** Minimal Anthropic SSE stream: text delta + message_stop. */
export function anthropicSuccessBody(): ContractStubResponse {
  return {
    body:
      `data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}}\n\n` +
      `data: {"type":"message_stop"}\n\n`,
  }
}

/** Minimal Gemini SSE stream: one text candidate with finish reason (terminal). */
export function geminiSuccessBody(): ContractStubResponse {
  return {
    body:
      `data: {"candidates":[{"content":{"parts":[{"text":"hi"}]},"finishReason":"STOP"}]}\n\n`,
  }
}

/** Ollama NDJSON stream. */
export function ollamaSuccessBody(): ContractStubResponse {
  return {
    body:
      `{"message":{"content":"hi"}}\n` +
      `{"done":true}\n`,
    contentType: 'application/x-ndjson',
  }
}
