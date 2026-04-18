import { describe, expect, it } from 'vitest'
import {
  createProgressiveArgParser,
  executeToolProgressively,
} from '../src/progressive'
import type { ToolDefinition } from '../src/types/tool'

async function* asChunks(parts: string[]): AsyncGenerator<string> {
  for (const p of parts) yield p
}

describe('createProgressiveArgParser', () => {
  it('emits one event per completed top-level field', () => {
    const p = createProgressiveArgParser()
    const events = [
      ...p.push('{"query"'),
      ...p.push(':"hello"'),
      ...p.push(', "limit": 10'),
      ...p.push('}'),
    ]
    expect(events.map(e => e.field)).toEqual(['query', 'limit'])
    expect(p.value).toEqual({ query: 'hello', limit: 10 })
  })

  it('parses nested objects atomically', () => {
    const p = createProgressiveArgParser()
    p.push('{"filter": {"a": 1, "b": [2,3]}, "k": "v"}')
    p.end()
    expect(p.value).toEqual({ filter: { a: 1, b: [2, 3] }, k: 'v' })
  })

  it('handles escaped strings', () => {
    const p = createProgressiveArgParser()
    p.push('{"msg": "he said \\"hi\\""}')
    p.end()
    expect(p.value).toEqual({ msg: 'he said "hi"' })
  })

  it('throws on malformed opening char', () => {
    const p = createProgressiveArgParser()
    expect(() => p.push('x{')).toThrow(/Expected '{'/)
  })

  it('throws on unclosed stream', () => {
    const p = createProgressiveArgParser()
    p.push('{"a": 1')
    expect(() => p.end()).toThrow(/without closing/)
  })

  it('buffers until a field value is fully scannable', () => {
    const p = createProgressiveArgParser()
    expect(p.push('{"q":')).toEqual([])
    expect(p.push('"part')).toEqual([])
    const [ev] = p.push('ial"}')
    expect(ev?.field).toBe('q')
    expect(p.value).toEqual({ q: 'partial' })
  })

  it('preserves raw text per field', () => {
    const p = createProgressiveArgParser()
    p.push('{"n": 42}')
    p.end()
    expect(p.events[0]!.raw).toBe('42')
  })
})

describe('executeToolProgressively', () => {
  it('fires tool execution after first field by default', async () => {
    const seen: Record<string, unknown>[] = []
    const tool: ToolDefinition = {
      name: 'search',
      execute: async args => {
        seen.push({ ...args })
        return 'ok'
      },
    }
    const result = executeToolProgressively(
      tool,
      asChunks(['{"query":"hello"', ', "limit": 10}']),
      { messages: [], callId: 'c1' },
    )
    const out = await result.execution
    expect(out).toBe('ok')
    expect(seen).toHaveLength(1)
    expect(seen[0]).toEqual({ query: 'hello' })
    expect(result.finalArgs).toEqual({ query: 'hello', limit: 10 })
  })

  it('respects triggerFields', async () => {
    const seen: Record<string, unknown>[] = []
    const tool: ToolDefinition = {
      name: 't',
      execute: async args => {
        seen.push({ ...args })
      },
    }
    const r = executeToolProgressively(
      tool,
      asChunks(['{"a":1,', ' "b": 2, "c": 3}']),
      { messages: [], callId: 'c2' },
      { triggerFields: ['b'] },
    )
    await r.execution
    expect(seen[0]).toEqual({ a: 1, b: 2 })
  })

  it('invokes onField for every field', async () => {
    const fields: string[] = []
    const r = executeToolProgressively(
      { name: 't', execute: async () => null },
      asChunks(['{"a":1,"b":2}']),
      { messages: [], callId: 'c3' },
      { onField: ev => fields.push(ev.field) },
    )
    await r.execution
    expect(fields).toEqual(['a', 'b'])
  })

  it('handles tools with no execute function', async () => {
    const r = executeToolProgressively(
      { name: 'noop' },
      asChunks(['{"x":1}']),
      { messages: [], callId: 'c4' },
    )
    expect(await r.execution).toBeUndefined()
  })

  it('starts execution even when args are empty', async () => {
    let called = false
    const r = executeToolProgressively(
      {
        name: 'noargs',
        execute: async args => {
          called = true
          expect(args).toEqual({})
        },
      },
      asChunks(['{}']),
      { messages: [], callId: 'c5' },
    )
    await r.execution
    expect(called).toBe(true)
  })
})
