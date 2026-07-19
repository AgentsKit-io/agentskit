import { describe, expect, it } from 'vitest'
import type { StreamParser } from '../src/stream-types'

describe('StreamParser', () => {
  it('accepts response context without requiring it from custom callers', () => {
    const parser: StreamParser = async function* (_stream, response) {
      yield { type: 'text', content: response?.headers.get('x-test') ?? 'none' }
      yield { type: 'done' }
    }
    expect(typeof parser).toBe('function')
  })
})
