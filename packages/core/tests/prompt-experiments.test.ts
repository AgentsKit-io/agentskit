import { describe, expect, it, vi } from 'vitest'
import {
  createPromptExperiment,
  flagResolver,
  stickyResolver,
} from '../src/prompt-experiments'

const variants = [
  { id: 'a', prompt: 'variant A' },
  { id: 'b', prompt: 'variant B' },
  { id: 'c', prompt: 'variant C' },
]

describe('stickyResolver', () => {
  it('same subjectId maps to the same variant across calls', () => {
    const resolve = stickyResolver()
    const first = resolve(variants, { subjectId: 'user-42' })
    const second = resolve(variants, { subjectId: 'user-42' })
    expect((first as { id: string }).id).toBe((second as { id: string }).id)
  })

  it('respects weights', () => {
    const resolve = stickyResolver()
    const weighted = [
      { id: 'a', prompt: 'A', weight: 0 },
      { id: 'b', prompt: 'B', weight: 1 },
    ]
    for (const sub of ['u1', 'u2', 'u3', 'u4', 'u5']) {
      expect((resolve(weighted, { subjectId: sub }) as { id: string }).id).toBe('b')
    }
  })

  it('falls back to first when all weights are zero', () => {
    const resolve = stickyResolver()
    const weighted = [
      { id: 'a', prompt: 'A', weight: 0 },
      { id: 'b', prompt: 'B', weight: 0 },
    ]
    expect((resolve(weighted, { subjectId: 'x' }) as { id: string }).id).toBe('a')
  })
})

describe('createPromptExperiment', () => {
  it('rejects empty variants', () => {
    expect(() => createPromptExperiment({ name: 'x', variants: [], resolve: () => 'a' })).toThrow(/no variants/)
  })

  it('returns the variant a custom resolver picks (string return)', async () => {
    const exp = createPromptExperiment({
      name: 'copy-test',
      variants,
      resolve: () => 'b',
    })
    const d = await exp.pick({ subjectId: 'u1' })
    expect(d.variantId).toBe('b')
    expect(d.prompt).toBe('variant B')
    expect(d.fallback).toBe(false)
  })

  it('accepts a variant object return', async () => {
    const exp = createPromptExperiment({
      name: 'x',
      variants,
      resolve: vs => vs[2]!,
    })
    const d = await exp.pick()
    expect(d.variantId).toBe('c')
  })

  it('falls back to sticky when resolver returns unknown id', async () => {
    const exp = createPromptExperiment({
      name: 'x',
      variants,
      resolve: () => 'z',
    })
    const d = await exp.pick({ subjectId: 'u1' })
    expect(['a', 'b', 'c']).toContain(d.variantId)
    expect(d.fallback).toBe(true)
  })

  it('falls back to sticky when resolver throws', async () => {
    const exp = createPromptExperiment({
      name: 'x',
      variants,
      resolve: () => {
        throw new Error('flag server down')
      },
    })
    const d = await exp.pick({ subjectId: 'u1' })
    expect(['a', 'b', 'c']).toContain(d.variantId)
    expect(d.fallback).toBe(true)
  })

  it('fires onExposure per pick', async () => {
    const onExposure = vi.fn()
    const exp = createPromptExperiment({
      name: 'exp',
      variants,
      resolve: () => 'a',
      onExposure,
    })
    await exp.pick({ subjectId: 'u1' })
    expect(onExposure).toHaveBeenCalledWith({
      name: 'exp',
      variantId: 'a',
      subjectId: 'u1',
      fallback: false,
    })
  })
})

describe('flagResolver', () => {
  it('maps flag provider output into a variant', async () => {
    const exp = createPromptExperiment({
      name: 'copy',
      variants,
      resolve: flagResolver(async (name, ctx) => {
        expect(name).toBe('copy')
        expect(ctx.subjectId).toBe('u1')
        return 'b'
      }, 'copy'),
    })
    const d = await exp.pick({ subjectId: 'u1' })
    expect(d.variantId).toBe('b')
    expect(d.fallback).toBe(false)
  })

  it('falls back when flag returns unknown variant', async () => {
    const exp = createPromptExperiment({
      name: 'copy',
      variants,
      resolve: flagResolver(() => 'unknown', 'copy'),
    })
    const d = await exp.pick({ subjectId: 'u1' })
    expect(['a', 'b', 'c']).toContain(d.variantId)
    expect(d.fallback).toBe(true)
  })

  it('uses the final weighted variant when a random roll reaches the boundary', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99999)
    const exp = createPromptExperiment({
      name: 'random', variants, resolve: () => undefined as never,
    })
    const decision = await exp.pick()
    expect(decision.variantId).toBe('c')
    vi.restoreAllMocks()
  })
})
