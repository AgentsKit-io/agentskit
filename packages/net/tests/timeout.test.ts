import { createServer, type Server } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { NetErrorCodes } from '../src/errors'
import { anySignal, timeoutSignal, withTimeout } from '../src/timeout'

async function startHangingServer(): Promise<{
  url: string
  requestReceived: Promise<void>
  responseClosed: Promise<void>
  close: () => Promise<void>
}> {
  let onRequest!: () => void
  let onResponseClose!: () => void
  const requestReceived = new Promise<void>(resolve => (onRequest = resolve))
  const responseClosed = new Promise<void>(resolve => (onResponseClose = resolve))
  const server: Server = createServer((_request, response) => {
    onRequest()
    response.on('close', () => {
      if (!response.writableEnded) onResponseClose()
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected an IP socket address')
  return {
    url: 'http://127.0.0.1:' + address.port,
    requestReceived,
    responseClosed,
    close: () =>
      new Promise<void>(resolve => {
        server.close(() => resolve())
        server.closeAllConnections()
      }),
  }
}

describe('timeoutSignal / anySignal', () => {
  it('aborts after the timeout with a TimeoutError', async () => {
    const signal = timeoutSignal(10)
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(signal.aborted).toBe(true)
    expect((signal.reason as Error).name).toBe('TimeoutError')
  })

  it('follows the parent signal', () => {
    const parent = new AbortController()
    const signal = timeoutSignal(10_000, parent.signal)
    parent.abort(new Error('parent'))
    expect(signal.aborted).toBe(true)
    expect((signal.reason as Error).message).toBe('parent')
  })

  it('rejects invalid timeouts', () => {
    expect(() => timeoutSignal(0)).toThrow(/timeout/)
    expect(() => timeoutSignal(Number.NaN)).toThrow(/timeout/)
  })

  it('combines signals, with a fallback when AbortSignal.any is missing', () => {
    const a = new AbortController()
    expect(anySignal([a.signal, undefined])).toBe(a.signal)
    const original = (AbortSignal as { any?: unknown }).any
    ;(AbortSignal as { any?: unknown }).any = undefined
    try {
      const b = new AbortController()
      const c = new AbortController()
      const combined = anySignal([b.signal, c.signal])
      c.abort('second')
      expect(combined.aborted).toBe(true)
      expect(combined.reason).toBe('second')
      const pre = anySignal([AbortSignal.abort('already'), new AbortController().signal])
      expect(pre.reason).toBe('already')
    } finally {
      ;(AbortSignal as { any?: unknown }).any = original
    }
  })
})

describe('withTimeout', () => {
  it('aborts a real fetch and closes the server connection at the deadline', async () => {
    const server = await startHangingServer()
    try {
      const pending = withTimeout(signal => fetch(server.url, { signal }), 500)
      await server.requestReceived
      await expect(pending).rejects.toMatchObject({ code: NetErrorCodes.AK_NET_TIMEOUT })
      await server.responseClosed
    } finally {
      await server.close()
    }
  })

  it('propagates a parent abort reason to work and closes the real fetch connection', async () => {
    const server = await startHangingServer()
    const parent = new AbortController()
    const reason = new Error('caller cancelled')
    let workSignal: AbortSignal | undefined
    try {
      const pending = withTimeout(signal => {
        workSignal = signal
        return fetch(server.url, { signal })
      }, 10_000, parent.signal)
      await server.requestReceived
      parent.abort(reason)
      await expect(pending).rejects.toBe(reason)
      expect(workSignal?.reason).toBe(reason)
      await server.responseClosed
    } finally {
      await server.close()
    }
  })

  it('rejects at the deadline even when work ignores its signal', async () => {
    await expect(withTimeout(() => new Promise<never>(() => {}), 10)).rejects.toMatchObject({
      code: NetErrorCodes.AK_NET_TIMEOUT,
    })
  })

  it('preserves parent aborts and original work failures', async () => {
    const parent = new AbortController()
    const reason = new Error('caller cancelled')
    const work = vi.fn(async (_signal: AbortSignal) => 'unused')
    parent.abort(reason)
    await expect(withTimeout(work, 100, parent.signal)).rejects.toBe(reason)
    expect(work).not.toHaveBeenCalled()

    const failure = new Error('work failed')
    await expect(withTimeout(async () => Promise.reject(failure), 100)).rejects.toBe(failure)
  })

  it('rejects invalid deadlines with AK_NET_INVALID_INPUT', async () => {
    const work = vi.fn(async () => 'unused')
    await expect(withTimeout(work, 0)).rejects.toMatchObject({
      code: NetErrorCodes.AK_NET_INVALID_INPUT,
      message: expect.stringContaining('greater than 0'),
    })
    for (const ms of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER]) {
      await expect(withTimeout(work, ms)).rejects.toMatchObject({ code: NetErrorCodes.AK_NET_INVALID_INPUT })
    }
    expect(work).not.toHaveBeenCalled()
  })

  it('clears the deadline timer and parent listener after completion', async () => {
    vi.useFakeTimers()
    const parent = new AbortController()
    const removeListener = vi.spyOn(parent.signal, 'removeEventListener')
    try {
      await expect(withTimeout(async () => 42, 5_000, parent.signal)).resolves.toBe(42)
      expect(vi.getTimerCount()).toBe(0)
      expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function))

      const failure = new Error('work failed')
      await expect(withTimeout(async () => Promise.reject(failure), 5_000, parent.signal)).rejects.toBe(failure)
      expect(vi.getTimerCount()).toBe(0)
      expect(removeListener).toHaveBeenCalledTimes(2)

      const cancelledBy = new AbortController()
      const removeCancelledListener = vi.spyOn(cancelledBy.signal, 'removeEventListener')
      const reason = new Error('caller cancelled')
      const pending = withTimeout(() => new Promise<never>(() => {}), 5_000, cancelledBy.signal)
      cancelledBy.abort(reason)
      await expect(pending).rejects.toBe(reason)
      expect(vi.getTimerCount()).toBe(0)
      expect(removeCancelledListener).toHaveBeenCalledWith('abort', expect.any(Function))
    } finally {
      vi.useRealTimers()
      vi.restoreAllMocks()
    }
  })
})
