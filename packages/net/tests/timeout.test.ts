import { describe, expect, it } from 'vitest'
import { anySignal, timeoutSignal } from '../src/timeout'

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
