import { describe, expect, it, vi } from 'vitest'
import { NetErrorCodes } from '../src/errors'
import { fetchWithRetry } from '../src/fetch'

function responder(...statuses: Array<number | Error | [number, Record<string, string>]>) {
  const calls: RequestInit[] = []
  const fetchImpl = vi.fn(async (_input: unknown, init?: RequestInit) => {
    calls.push(init ?? {})
    const next = statuses.shift()
    if (next instanceof Error) throw next
    const [status, headers] = Array.isArray(next) ? next : [next ?? 200, {}]
    return new Response(`body ${status}`, { status, headers })
  })
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls, spy: fetchImpl }
}

const fast = { minDelayMs: 1, maxDelayMs: 5 }

describe('fetchWithRetry', () => {
  it('retries retryable statuses and returns the first success', async () => {
    const { fetchImpl, spy } = responder(503, 502, 200)
    const onRetry = vi.fn()
    const response = await fetchWithRetry('https://api.test/x', {}, { ...fast, fetch: fetchImpl, onRetry })
    expect(response.status).toBe(200)
    expect(spy).toHaveBeenCalledTimes(3)
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }))
  })

  it('returns the last retryable response when retries run out', async () => {
    const { fetchImpl } = responder(503, 503)
    const response = await fetchWithRetry('https://api.test/x', {}, { ...fast, retries: 1, fetch: fetchImpl })
    expect(response.status).toBe(503)
    expect(await response.text()).toBe('body 503')
  })

  it('does not retry client errors', async () => {
    const { fetchImpl, spy } = responder(404)
    expect((await fetchWithRetry('https://api.test/x', {}, { ...fast, fetch: fetchImpl })).status).toBe(404)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('honours Retry-After, and returns immediately when it exceeds the cap', async () => {
    const { fetchImpl } = responder([429, { 'retry-after': '0' }], 200)
    const onRetry = vi.fn()
    expect((await fetchWithRetry('https://api.test/x', {}, { fetch: fetchImpl, onRetry })).status).toBe(200)
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ delayMs: 0, status: 429 }))

    const slow = responder([429, { 'retry-after': '3600' }], 200)
    const response = await fetchWithRetry('https://api.test/x', {}, { fetch: slow.fetchImpl })
    expect(response.status).toBe(429)
    expect(slow.spy).toHaveBeenCalledTimes(1)
  })

  it('retries network errors and rethrows the last one', async () => {
    const { fetchImpl, spy } = responder(new TypeError('fetch failed'), new TypeError('fetch failed'))
    await expect(fetchWithRetry('https://api.test/x', {}, { ...fast, retries: 1, fetch: fetchImpl })).rejects.toThrow('fetch failed')
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('only retries idempotent methods unless told otherwise', async () => {
    const post = responder(503, 200)
    expect((await fetchWithRetry('https://api.test/x', { method: 'POST', body: '{}' }, { ...fast, fetch: post.fetchImpl })).status).toBe(503)
    const all = responder(503, 200)
    const response = await fetchWithRetry('https://api.test/x', { method: 'post', body: '{}' }, { ...fast, retryMethods: 'all', fetch: all.fetchImpl })
    expect(response.status).toBe(200)
  })

  it('never retries a streaming request body', async () => {
    const { fetchImpl, spy } = responder(503, 200)
    const body = new ReadableStream({ start: c => c.close() })
    await fetchWithRetry('https://api.test/x', { method: 'PUT', body, duplex: 'half' } as RequestInit, { ...fast, fetch: fetchImpl })
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('times out each attempt with a typed error', async () => {
    const hang = vi.fn(
      (_input: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))),
    ) as unknown as typeof fetch
    await expect(fetchWithRetry('https://api.test/x', {}, { ...fast, retries: 1, timeoutMs: 20, fetch: hang })).rejects.toMatchObject({
      code: NetErrorCodes.AK_NET_TIMEOUT,
    })
  })

  it('stops on the caller abort without retrying', async () => {
    const controller = new AbortController()
    const hang = vi.fn(
      (_input: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))),
    )
    const pending = fetchWithRetry('https://api.test/x', { signal: controller.signal }, { ...fast, timeoutMs: 5000, fetch: hang as unknown as typeof fetch })
    controller.abort(new Error('user cancelled'))
    await expect(pending).rejects.toThrow('user cancelled')
    expect(hang).toHaveBeenCalledTimes(1)
  })

  it('respects custom retry statuses and clones Request inputs', async () => {
    const { fetchImpl, spy } = responder(409, 200)
    const response = await fetchWithRetry(new Request('https://api.test/x'), {}, { ...fast, retryStatuses: [409], fetch: fetchImpl })
    expect(response.status).toBe(200)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('requires a fetch implementation', async () => {
    const original = globalThis.fetch
    ;(globalThis as { fetch?: typeof fetch }).fetch = undefined
    try {
      await expect(fetchWithRetry('https://api.test/x')).rejects.toThrow(/fetch/)
    } finally {
      globalThis.fetch = original
    }
  })
})
