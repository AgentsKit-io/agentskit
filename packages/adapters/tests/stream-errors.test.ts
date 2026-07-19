import { describe, expect, it } from 'vitest'
import { adapterErrorChunk, isAbortError, parseCompleteToolArgs } from '../src/stream-errors'

describe('stream errors', () => {
  it('normalizes errors and validates complete tool arguments', () => {
    expect(adapterErrorChunk('failed').metadata?.error).toBeInstanceOf(Error)
    expect(isAbortError(new DOMException('stopped', 'AbortError'))).toBe(true)
    expect(parseCompleteToolArgs('{"ok":true}')).toEqual({
      ok: true,
      args: '{"ok":true}',
    })
    expect(parseCompleteToolArgs('{').ok).toBe(false)
  })
})
