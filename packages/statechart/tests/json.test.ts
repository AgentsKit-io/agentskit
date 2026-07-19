import { describe, expect, it, vi } from 'vitest'

import { cloneJsonObject } from '../src/json'

describe('JSON boundary', () => {
  it.each([
    [{ value: Number.NaN }, 'finite'],
    [{ value: undefined }, 'JSON-compatible'],
    [{ value: new Date() }, 'plain objects'],
  ])('rejects values that JSON cannot preserve', (input, message) => {
    expect(() => cloneJsonObject(input)).toThrow(message)
  })

  it('rejects cycles and symbol keys', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(() => cloneJsonObject(cyclic)).toThrow('cycles')
    expect(() => cloneJsonObject({ [Symbol('key')]: true })).toThrow('symbol keys')
  })

  it('requires an object at the context root', () => {
    expect(() => cloneJsonObject([])).toThrow('context must be a JSON object')
  })

  it('rejects sparse, decorated, symbolic, and accessor arrays without dropping data', () => {
    const sparse = new Array(2)
    sparse[1] = 'value'

    const decorated: unknown[] = ['value']
    Object.defineProperty(decorated, 'label', { enumerable: true, value: 'hidden' })

    const symbolic: unknown[] = ['value']
    Object.defineProperty(symbolic, Symbol('metadata'), { value: true })

    const getter = vi.fn(() => 'value')
    const accessor: unknown[] = []
    Object.defineProperty(accessor, '0', { enumerable: true, get: getter })

    expect(() => cloneJsonObject({ value: sparse })).toThrow('dense')
    expect(() => cloneJsonObject({ value: decorated })).toThrow('indexed')
    expect(() => cloneJsonObject({ value: symbolic })).toThrow('symbol keys')
    expect(() => cloneJsonObject({ value: accessor })).toThrow('accessors')
    expect(getter).not.toHaveBeenCalled()
  })

  it('rejects object accessors without invoking them', () => {
    const getter = vi.fn(() => 'secret')
    const input = {}
    Object.defineProperty(input, 'value', { enumerable: true, get: getter })
    expect(() => cloneJsonObject(input)).toThrow('accessors')
    expect(getter).not.toHaveBeenCalled()
  })

  it('rejects non-enumerable object data instead of silently dropping it', () => {
    const input = {}
    Object.defineProperty(input, 'hidden', { value: 'data' })
    expect(() => cloneJsonObject(input)).toThrow('non-enumerable')
  })

  it('normalizes negative zero and safely preserves hostile property names', () => {
    const input = JSON.parse('{"__proto__":{"polluted":true},"value":-0}') as Record<string, unknown>
    const cloned = cloneJsonObject(input)

    expect(Object.is(cloned.value, -0)).toBe(false)
    expect(cloned.value).toBe(0)
    expect(Object.hasOwn(cloned, '__proto__')).toBe(true)
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
    expect(Object.isFrozen(cloned.__proto__)).toBe(true)
  })
})
