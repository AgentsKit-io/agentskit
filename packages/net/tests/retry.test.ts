import { describe, expect, it, vi } from 'vitest'
import { computeBackoff, isRetryableStatus, parseRetryAfter, retry } from '../src/retry'

describe('parseRetryAfter', () => {
  it('reads delta-seconds and HTTP dates', () => {
    const now = Date.parse('2026-01-01T00:00:00Z')
    expect(parseRetryAfter('2', now)).toBe(2000)
    expect(parseRetryAfter('1.5', now)).toBe(1500)
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:05 GMT', now)).toBe(5000)
    expect(parseRetryAfter('Wed, 31 Dec 2025 00:00:00 GMT', now)).toBe(0)
  })

  it('ignores absent or invalid values', () => {
    expect(parseRetryAfter(null)).toBeUndefined()
    expect(parseRetryAfter('')).toBeUndefined()
    expect(parseRetryAfter('soon')).toBeUndefined()
  })
})

describe('computeBackoff', () => {
  it('grows exponentially, caps, and jitters in [0, base]', () => {
    expect(computeBackoff(1, { jitter: 'none' })).toBe(250)
    expect(computeBackoff(3, { jitter: 'none' })).toBe(1000)
    expect(computeBackoff(20, { jitter: 'none', maxDelayMs: 5000 })).toBe(5000)
    expect(computeBackoff(3, {}, () => 0.5)).toBe(500)
    expect(computeBackoff(3, {}, () => 0)).toBe(0)
  })
})

describe('isRetryableStatus', () => {
  it('covers 408/425/429/5xx gateway errors only', () => {
    for (const status of [408, 425, 429, 500, 502, 503, 504]) expect(isRetryableStatus(status)).toBe(true)
    for (const status of [200, 400, 401, 403, 404, 422, 501]) expect(isRetryableStatus(status)).toBe(false)
  })
})

describe('retry', () => {
  it('retries until success and reports each retry', async () => {
    const onRetry = vi.fn()
    let calls = 0
    const result = await retry(
      async ({ attempt }) => {
        calls++
        if (attempt < 3) throw new Error(`fail ${attempt}`)
        return 'ok'
      },
      { minDelayMs: 1, onRetry },
    )
    expect(result).toBe('ok')
    expect(calls).toBe(3)
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it('gives up after the retry budget', async () => {
    const fn = vi.fn(async () => {
      throw new Error('down')
    })
    await expect(retry(fn, { retries: 2, minDelayMs: 1 })).rejects.toThrow('down')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('never retries aborts and honours shouldRetry', async () => {
    const abort = vi.fn(async () => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    })
    await expect(retry(abort, { minDelayMs: 1 })).rejects.toThrow('aborted')
    expect(abort).toHaveBeenCalledTimes(1)
    const fatal = vi.fn(async () => {
      throw new Error('400')
    })
    await expect(retry(fatal, { minDelayMs: 1, shouldRetry: () => false })).rejects.toThrow('400')
    expect(fatal).toHaveBeenCalledTimes(1)
  })

  it('uses delayFor overrides and stops sleeping when the signal aborts', async () => {
    const controller = new AbortController()
    const started = Date.now()
    const pending = retry(
      async () => {
        throw new Error('busy')
      },
      { delayFor: () => 10_000, signal: controller.signal },
    )
    setTimeout(() => controller.abort(new Error('stop')), 20)
    await expect(pending).rejects.toThrow('stop')
    expect(Date.now() - started).toBeLessThan(2000)
  })

  it('rejects an invalid retry budget', async () => {
    await expect(retry(async () => 1, { retries: -1 })).rejects.toThrow(/retries/)
  })

  it('does not start when the signal is already aborted', async () => {
    const fn = vi.fn(async () => 1)
    await expect(retry(fn, { signal: AbortSignal.abort(new Error('early')) })).rejects.toThrow('early')
    expect(fn).not.toHaveBeenCalled()
  })
})
