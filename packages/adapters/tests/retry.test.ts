import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchWithRetry } from '../src/utils'

afterEach(() => vi.restoreAllMocks())

const noSleep = (_ms: number) => Promise.resolve()

function fakeResponse(status: number, body = '', headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers })
}

describe('fetchWithRetry', () => {
  it('returns immediately on success (2xx)', async () => {
    const fn = vi.fn().mockResolvedValue(fakeResponse(200, 'ok'))
    const signal = new AbortController().signal

    const res = await fetchWithRetry(fn, signal, { sleep: noSleep })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(200)
  })

  it('does not retry 4xx that are not 408 or 429 (auth errors are terminal)', async () => {
    const fn = vi.fn().mockResolvedValue(fakeResponse(401, 'Unauthorized'))
    const signal = new AbortController().signal

    const res = await fetchWithRetry(fn, signal, { sleep: noSleep })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(401)
  })

  it('retries on 429 then succeeds', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(429))
      .mockResolvedValueOnce(fakeResponse(200, 'ok'))
    const signal = new AbortController().signal

    const res = await fetchWithRetry(fn, signal, { sleep: noSleep, jitter: false })

    expect(fn).toHaveBeenCalledTimes(2)
    expect(res.status).toBe(200)
  })

  it('retries on 5xx then succeeds', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(503))
      .mockResolvedValueOnce(fakeResponse(502))
      .mockResolvedValueOnce(fakeResponse(200, 'ok'))
    const signal = new AbortController().signal

    const res = await fetchWithRetry(fn, signal, { sleep: noSleep, jitter: false, maxAttempts: 3 })

    expect(fn).toHaveBeenCalledTimes(3)
    expect(res.status).toBe(200)
  })

  it('respects Retry-After header (seconds)', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(429, '', { 'retry-after': '7' }))
      .mockResolvedValueOnce(fakeResponse(200, 'ok'))
    const signal = new AbortController().signal
    const sleep = vi.fn().mockResolvedValue(undefined)

    const res = await fetchWithRetry(fn, signal, { sleep })

    expect(sleep).toHaveBeenCalledWith(7000)
    expect(res.status).toBe(200)
  })

  it('uses exponential backoff when jitter is off', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(503))
      .mockResolvedValueOnce(fakeResponse(503))
      .mockResolvedValueOnce(fakeResponse(200, 'ok'))
    const signal = new AbortController().signal
    const sleep = vi.fn().mockResolvedValue(undefined)

    await fetchWithRetry(fn, signal, { sleep, jitter: false, baseDelayMs: 100, maxAttempts: 3 })

    // attempt 1 backoff = 100, attempt 2 backoff = 200
    expect(sleep).toHaveBeenNthCalledWith(1, 100)
    expect(sleep).toHaveBeenNthCalledWith(2, 200)
  })

  it('returns the last response if all retries exhausted', async () => {
    const fn = vi.fn().mockResolvedValue(fakeResponse(503))
    const signal = new AbortController().signal

    const res = await fetchWithRetry(fn, signal, { sleep: noSleep, maxAttempts: 3 })

    expect(fn).toHaveBeenCalledTimes(3)
    expect(res.status).toBe(503)
  })

  it('rethrows on AbortError without retrying', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError')
    const fn = vi.fn().mockRejectedValue(abortErr)
    const signal = new AbortController().signal

    await expect(fetchWithRetry(fn, signal, { sleep: noSleep })).rejects.toThrow(/Aborted/)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on network errors then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(fakeResponse(200, 'ok'))
    const signal = new AbortController().signal

    const res = await fetchWithRetry(fn, signal, { sleep: noSleep, maxAttempts: 3 })

    expect(fn).toHaveBeenCalledTimes(3)
    expect(res.status).toBe(200)
  })

  it('throws when network errors persist beyond maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const signal = new AbortController().signal

    await expect(
      fetchWithRetry(fn, signal, { sleep: noSleep, maxAttempts: 2 }),
    ).rejects.toThrow('fetch failed')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('checks abort signal between attempts', async () => {
    const controller = new AbortController()
    const fn = vi.fn().mockImplementation(async () => {
      controller.abort()
      return fakeResponse(503)
    })

    await expect(
      fetchWithRetry(fn, controller.signal, { sleep: noSleep, maxAttempts: 3 }),
    ).rejects.toThrow(/Aborted/)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('calls onRetry hook with attempt + delay + reason', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(503))
      .mockResolvedValueOnce(fakeResponse(200, 'ok'))
    const signal = new AbortController().signal
    const onRetry = vi.fn()

    await fetchWithRetry(fn, signal, { sleep: noSleep, jitter: false, baseDelayMs: 50, onRetry })

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith({ attempt: 1, delayMs: 50, reason: 'HTTP 503' })
  })

  it('respects custom retryOn predicate', async () => {
    const fn = vi.fn().mockResolvedValue(fakeResponse(418))
    const signal = new AbortController().signal

    const res = await fetchWithRetry(fn, signal, {
      sleep: noSleep,
      retryOn: ({ response }) => response?.status === 418,
      maxAttempts: 2,
    })

    expect(fn).toHaveBeenCalledTimes(2)
    expect(res.status).toBe(418)
  })
})
