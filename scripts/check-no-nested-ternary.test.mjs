import { describe, expect, it } from 'vitest'
import { findNestedTernaries } from './lib/no-nested-ternary.mjs'

describe('nested ternary detector', () => {
  it('finds a conditional nested in another conditional', () => {
    expect(findNestedTernaries('fixture.ts', 'const value = ok ? yes : other ? no : maybe')).toHaveLength(1)
  })

  it('allows independent conditional expressions', () => {
    expect(findNestedTernaries('fixture.ts', 'const value = ok ? yes : no; const other = ready ? a : b')).toEqual([])
  })
})
