import { describe, expect, it } from 'vitest'
import { SANDBOX_LEVELS } from '../src/index'

describe('SANDBOX_LEVELS', () => {
  it('ranks isolation strength from none upward', () => {
    expect(SANDBOX_LEVELS).toEqual(['none', 'process', 'container', 'vm', 'webcontainer'])
  })
})
