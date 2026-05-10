import { describe, expect, it, vi } from 'vitest'
import { resolveModel, DEFAULT_DEPRECATION_TABLE } from '../src/deprecation'

describe('resolveModel', () => {
  it('passes through a non-deprecated model', () => {
    const result = resolveModel(
      { provider: 'openai', model: 'gpt-4o' },
      { onDeprecation: 'remap' },
    )
    expect(result).toEqual({ model: 'gpt-4o', remapped: false })
  })

  it('warns on a deprecated model and keeps the input', () => {
    const logger = vi.fn()
    const result = resolveModel(
      { provider: 'openai', model: 'gpt-3.5-turbo-0301' },
      { onDeprecation: 'warn', logger },
    )
    expect(result.model).toBe('gpt-3.5-turbo-0301')
    expect(result.remapped).toBe(false)
    expect(logger).toHaveBeenCalledOnce()
    expect(logger.mock.calls[0]![0]).toContain('deprecated')
  })

  it('remaps on a deprecated model', () => {
    const result = resolveModel(
      { provider: 'anthropic', model: 'claude-2.0' },
      { onDeprecation: 'remap', logger: () => {} },
    )
    expect(result.remapped).toBe(true)
    expect(result.model).toBe('claude-3-5-sonnet-latest')
  })

  it('throws on `fail`', () => {
    expect(() =>
      resolveModel(
        { provider: 'openai', model: 'gpt-4-32k' },
        { onDeprecation: 'fail' },
      ),
    ).toThrow(/deprecated/)
  })

  it('uses the default table when none passed', () => {
    expect(DEFAULT_DEPRECATION_TABLE.length).toBeGreaterThan(0)
  })
})
