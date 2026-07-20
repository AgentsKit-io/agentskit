import { describe, expect, it } from 'vitest'
import {
  appendCapped,
  applyChunk,
  finalStderr,
  isOutbound,
  normalizeExitCode,
  utf8ByteLength,
  type CaptureState,
} from '../src/web/web-worker-helpers'

describe('isOutbound', () => {
  it('narrows valid chunk and done messages', () => {
    expect(isOutbound({ type: 'chunk', stream: 'stdout', data: 'x' })).toBe(true)
    expect(isOutbound({ type: 'done', exitCode: 0, stderr: '' })).toBe(true)
  })

  it('rejects malformed payloads that would propagate NaN/undefined', () => {
    expect(isOutbound(null)).toBe(false)
    expect(isOutbound({ type: 'chunk', stream: 'out', data: 'x' })).toBe(false)
    expect(isOutbound({ type: 'chunk', stream: 'stdout', data: 1 })).toBe(false)
    expect(isOutbound({ type: 'done', exitCode: NaN, stderr: '' })).toBe(false)
    expect(isOutbound({ type: 'done', exitCode: undefined, stderr: '' })).toBe(false)
    expect(isOutbound({ type: 'done', exitCode: 0 })).toBe(false)
  })
})

describe('utf8ByteLength', () => {
  it('counts ASCII bytes 1:1', () => {
    expect(utf8ByteLength('abc')).toBe(3)
  })

  it('counts multi-byte characters', () => {
    expect(utf8ByteLength('é')).toBe(2)
    expect(utf8ByteLength('你')).toBe(3)
  })
})

describe('appendCapped', () => {
  it('appends when under the cap', () => {
    const total = { n: 0 }
    let truncated = false
    const result = appendCapped('', 'hello', total, 10, () => {
      truncated = true
    })
    expect(result).toEqual({ text: 'hello', accepted: 'hello' })
    expect(total.n).toBe(5)
    expect(truncated).toBe(false)
  })

  it('partially accepts and marks truncated when chunk overflows', () => {
    const total = { n: 0 }
    let truncated = false
    const result = appendCapped('', 'abcdefghij', total, 4, () => {
      truncated = true
    })
    expect(result.accepted).toBe('abcd')
    expect(result.text).toBe('abcd')
    expect(total.n).toBe(4)
    expect(truncated).toBe(true)
  })

  it('rejects further chunks once already at cap', () => {
    const total = { n: 4 }
    let truncated = false
    const result = appendCapped('abcd', 'xyz', total, 4, () => {
      truncated = true
    })
    expect(result).toEqual({ text: 'abcd', accepted: '' })
    expect(truncated).toBe(true)
  })
})

describe('applyChunk / finalStderr', () => {
  function freshState(maxOutputBytes: number): CaptureState {
    return {
      stdout: '',
      stderr: '',
      totalBytes: { n: 0 },
      truncated: false,
      maxOutputBytes,
    }
  }

  it('routes stdout and stderr independently under the shared byte cap', () => {
    const state = freshState(10)
    expect(applyChunk(state, 'stdout', 'hello')).toBe('hello')
    expect(applyChunk(state, 'stderr', 'world')).toBe('world')
    expect(state.stdout).toBe('hello')
    expect(state.stderr).toBe('world')
    expect(state.totalBytes.n).toBe(10)
  })

  it('appends a truncation marker on final stderr when capped', () => {
    const state = freshState(3)
    applyChunk(state, 'stderr', 'abcdef')
    expect(finalStderr(state)).toMatch(/truncated at 3 bytes/)
  })
})

describe('normalizeExitCode', () => {
  it('truncates finite codes and falls back to 1 for non-finite', () => {
    expect(normalizeExitCode(2.9)).toBe(2)
    expect(normalizeExitCode(NaN)).toBe(1)
    expect(normalizeExitCode(Infinity)).toBe(1)
  })
})
