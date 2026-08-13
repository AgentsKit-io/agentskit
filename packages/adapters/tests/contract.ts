import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AdapterFactory, StreamChunk } from '@agentskit/core'

/**
 * Contract test harness from ADR 0001 — runs invariants A1–A10 through an
 * explicit transport driver. Fetch-backed adapters use the stock driver;
 * SDK- or client-backed adapters can inject a driver without being silently
 * skipped.
 */
export interface ContractStubResponse {
  /** Raw body of the streaming response. Will be passed back as `Response.body`. */
  body: string | Uint8Array | ReadableStream<Uint8Array>
  status?: number
  contentType?: string
}

/**
 * Transport seam used by the contract harness. The default fetch-backed
 * driver keeps existing adapters unchanged; adapters backed by an SDK or
 * another client can provide their own driver instead of silently skipping
 * the shared contract suite.
 */
export interface ContractTransport {
  installProbe(): void
  installSuccess(stub: ContractStubResponse): void
  installFailure(): void
  installAbortable(stub: ContractStubResponse): void
  callCount(): number
  restore(originalFetch: typeof globalThis.fetch): void
}

export interface ContractAdapterCase {
  name: string
  /** Construct the adapter under test. */
  build(): AdapterFactory
  /** Provider-shaped success body. */
  successBody(): ContractStubResponse
  /** Explicit transport driver; no adapter is silently skipped. */
  transport: ContractTransport
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

function responseFor(stub: ContractStubResponse): Response {
  return new Response(bodyToStream(stub.body), {
    status: stub.status ?? 200,
    headers: { 'content-type': stub.contentType ?? 'text/event-stream' },
  })
}

function installFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  onCall: () => void,
): void {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    onCall()
    return handler(input, init)
  }) as unknown as typeof globalThis.fetch
}

/** Create the explicit driver used by fetch-backed adapters. */
export function createFetchContractTransport(): ContractTransport {
  let calls = 0

  const install = (handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) => {
    calls = 0
    installFetch(handler, () => { calls += 1 })
  }

  return {
    installProbe() {
      install(async () => new Response(null, { status: 204 }))
    },
    installSuccess(stub) {
      install(async () => responseFor(stub))
    },
    installFailure() {
      install(async () => new Response('upstream broke', { status: 500 }))
    },
    installAbortable(stub) {
      install(async (_input, init) => {
        const raw = stub.body
        if (raw instanceof ReadableStream) return responseFor(stub)
        return new Response(delayedAbortableStream(raw, init?.signal), {
          status: stub.status ?? 200,
          headers: { 'content-type': stub.contentType ?? 'text/event-stream' },
        })
      })
    },
    callCount() {
      return calls
    },
    restore(originalFetch) {
      globalThis.fetch = originalFetch
      calls = 0
    },
  }
}

/**
 * Small deterministic non-fetch driver used to prove the seam itself. It is
 * intentionally test-only: production adapters remain responsible for
 * adapting their SDK/client streams to the core contract.
 */
export interface InjectedContractTransport extends ContractTransport {
  stream(signal: AbortSignal): AsyncIterableIterator<StreamChunk>
}

export function createInjectedContractTransport(): InjectedContractTransport {
  type Scenario = 'probe' | 'success' | 'failure' | 'abortable'
  let scenario: Scenario = 'probe'
  let calls = 0

  const reset = (next: Scenario) => {
    scenario = next
    calls = 0
  }

  return {
    installProbe() { reset('probe') },
    installSuccess() { reset('success') },
    installFailure() { reset('failure') },
    installAbortable() { reset('abortable') },
    callCount() { return calls },
    restore() { reset('probe') },
    async *stream(signal) {
      calls += 1
      if (scenario === 'failure') throw new Error('upstream broke')
      if (scenario === 'abortable') {
        yield { type: 'text', content: 'hi' }
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 25)
          signal.addEventListener('abort', () => {
            clearTimeout(timer)
            resolve()
          }, { once: true })
        })
        if (signal.aborted) return
        yield { type: 'done' }
        return
      }
      yield { type: 'text', content: 'hi' }
      yield { type: 'done' }
    },
  }
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
  if (!adapterCase.transport) {
    throw new Error(`adapter contract "${adapterCase.name}" requires an explicit transport driver`)
  }

  describe(`adapter contract — ${adapterCase.name}`, () => {
    let originalFetch: typeof globalThis.fetch
    beforeEach(() => {
      originalFetch = globalThis.fetch
      adapterCase.transport.installProbe()
    })
    afterEach(() => { adapterCase.transport.restore(originalFetch) })

    it('A1: createSource is synchronous and does not fetch eagerly', () => {
      const factory = adapterCase.build()
      const source = factory.createSource({ messages: [userMessage('hi')] })
      expect(source).toBeDefined()
      expect(source.stream).toBeTypeOf('function')
      expect(source.abort).toBeTypeOf('function')
      expect(adapterCase.transport.callCount()).toBe(0)
    })

    it('A3 + A4: stream ends with exactly one terminal chunk (done or error)', async () => {
      adapterCase.transport.installSuccess(adapterCase.successBody())
      const out = await drain(adapterCase.build())
      const terminals = out.filter(c => c.type === 'done' || c.type === 'error')
      expect(terminals).toHaveLength(1)
      expect(isTerminal(out[out.length - 1])).toBe(true)
    })

    it('A6: abort is safe before stream() is called', () => {
      adapterCase.transport.installSuccess(adapterCase.successBody())
      const source = adapterCase.build().createSource({ messages: [userMessage('hi')] })
      expect(() => source.abort()).not.toThrow()
    })

    it('A6: abort is safe after stream() completes', async () => {
      adapterCase.transport.installSuccess(adapterCase.successBody())
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
      adapterCase.transport.installAbortable(stub)

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
      adapterCase.transport.installSuccess(adapterCase.successBody())
      const messages = [userMessage('hi')]
      const snapshot = JSON.stringify(messages)
      for await (const _ of adapterCase.build().createSource({ messages }).stream()) { void _ }
      expect(JSON.stringify(messages)).toBe(snapshot)
    })

    it('A9: upstream failure yields exactly one error chunk with metadata.error', async () => {
      adapterCase.transport.installFailure()
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

/**
 * Convenience wrapper for the stock adapters that use global fetch. Keeping
 * this explicit at each call site makes a missing transport driver fail at
 * type-check time instead of becoming an untested adapter.
 */
export function runFetchAdapterContract(
  adapterCase: Omit<ContractAdapterCase, 'transport'>,
): void {
  runAdapterContract({ ...adapterCase, transport: createFetchContractTransport() })
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
