import { describe, expect, it, vi } from 'vitest'
import { getCachedCost, resolveCost } from '../../src/catalog'

describe('catalog pricing', () => {
  it('cache-only by default, no fetch', async () => {
    const fetchImpl = vi.fn()
    const out = await resolveCost('openai', 'gpt-4o', { fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(out.source).toBe('cache')
  })

  it('getCachedCost is synchronous and reads the snapshot', () => {
    const cost = getCachedCost('openai', 'o3')
    expect(cost?.input).toBeTypeOf('number')
  })

  it('live mode returns live cost when fetch succeeds', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ openai: { models: { 'gpt-x': { cost: { input: 1.23, output: 4.56 } } } } }), {
        status: 200,
      }),
    )
    const out = await resolveCost('openai', 'gpt-x', { live: true, fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(out).toEqual({ cost: { input: 1.23, output: 4.56 }, source: 'live', stale: false })
  })

  it('falls back to cache when live fetch throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down')
    })
    const out = await resolveCost('openai', 'o3', { live: true, fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(out.source).toBe('cache')
    expect(out.cost?.input).toBeTypeOf('number')
  })

  it('falls back to cache on non-200', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 503 }))
    const out = await resolveCost('openai', 'o3', { live: true, fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(out.source).toBe('cache')
  })
})
