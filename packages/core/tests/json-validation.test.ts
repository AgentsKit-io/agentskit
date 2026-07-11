import { describe, expect, it } from 'vitest'
import { cloneJsonRecord } from '../src/json-validation'

describe('cloneJsonRecord', () => {
  it('returns an isolated JSON record', () => {
    const source = { nested: { value: 1 } }
    const clone = cloneJsonRecord(source, () => { throw new Error('invalid') })
    source.nested.value = 2
    expect(clone).toEqual({ nested: { value: 1 } })
  })
})
