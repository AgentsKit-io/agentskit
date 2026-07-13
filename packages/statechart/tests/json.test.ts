import { describe, expect, it } from 'vitest'

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
})
