import { describe, expect, it, vi } from 'vitest'
import {
  createLlmSelfDebugger,
  wrapToolWithSelfDebug,
} from '../src/self-debug'
import type { ToolDefinition } from '../src/types/tool'

const ctx = { messages: [], call: { id: 'c', name: 'x', args: {}, status: 'running' as const } }

function tool(
  name: string,
  run: (args: Record<string, unknown>) => unknown | Promise<unknown>,
  schema?: Record<string, unknown>,
): ToolDefinition {
  return { name, description: name, schema: schema as ToolDefinition['schema'], execute: async args => run(args) }
}

describe('wrapToolWithSelfDebug', () => {
  it('passes through on first-try success', async () => {
    const wrapped = wrapToolWithSelfDebug(
      tool('ok', async () => 'pass'),
      () => ({ args: null }),
    )
    expect(await wrapped.execute!({ x: 1 }, ctx)).toBe('pass')
  })

  it('retries with corrected args on failure', async () => {
    let calls = 0
    const wrapped = wrapToolWithSelfDebug(
      tool('flaky', async ({ value }) => {
        calls++
        if (value !== 'fixed') throw new Error('wrong value')
        return 'ok'
      }),
      () => ({ args: { value: 'fixed' } }),
    )
    const result = await wrapped.execute!({ value: 'bad' }, ctx)
    expect(result).toBe('ok')
    expect(calls).toBe(2)
  })

  it('gives up when debugger returns args: null', async () => {
    const wrapped = wrapToolWithSelfDebug(
      tool('bad', async () => {
        throw new Error('nope')
      }),
      () => ({ args: null }),
    )
    await expect(wrapped.execute!({}, ctx)).rejects.toThrow(/nope/)
  })

  it('stops after maxAttempts', async () => {
    let attempts = 0
    const wrapped = wrapToolWithSelfDebug(
      tool('bad', async () => {
        attempts++
        throw new Error('still bad')
      }),
      () => ({ args: { x: 1 } }),
      { maxAttempts: 1 },
    )
    await expect(wrapped.execute!({}, ctx)).rejects.toThrow(/still bad/)
    expect(attempts).toBe(2) // original + 1 retry
  })

  it('onEvent fires success/failure/retry/give-up', async () => {
    const events: string[] = []
    const wrapped = wrapToolWithSelfDebug(
      tool('flaky', async ({ value }) => {
        if (value === 'fixed') return 'ok'
        throw new Error('wrong')
      }),
      () => ({ args: { value: 'fixed' } }),
      {
        onEvent: e => events.push(e.type),
      },
    )
    await wrapped.execute!({ value: 'bad' }, ctx)
    expect(events).toEqual(['failure', 'retry', 'success'])
  })

  it('throws on tools without execute', () => {
    expect(() =>
      wrapToolWithSelfDebug({ name: 'no-exec', description: '' }, () => ({ args: null })),
    ).toThrow(/no execute/)
  })
})

describe('createLlmSelfDebugger', () => {
  it('parses a JSON object response into args', async () => {
    const debuggerFn = createLlmSelfDebugger(async () => '```json\n{"q":"fixed"}\n```')
    const result = await debuggerFn({
      tool: tool('t', async () => null),
      args: { q: 'bad' },
      error: new Error('boom'),
      attempt: 0,
    })
    expect(result.args).toEqual({ q: 'fixed' })
  })

  it('returns args: null when the response says giveUp', async () => {
    const debuggerFn = createLlmSelfDebugger(async () => '{"giveUp": true}')
    const result = await debuggerFn({
      tool: tool('t', async () => null),
      args: {},
      error: new Error('x'),
      attempt: 0,
    })
    expect(result.args).toBeNull()
  })

  it('returns args: null when no JSON object is present', async () => {
    const debuggerFn = createLlmSelfDebugger(async () => 'no clue sorry')
    const result = await debuggerFn({
      tool: tool('t', async () => null),
      args: {},
      error: new Error('x'),
      attempt: 0,
    })
    expect(result.args).toBeNull()
  })

  it('returns args: null on invalid JSON', async () => {
    const debuggerFn = createLlmSelfDebugger(async () => '{not json here}')
    const result = await debuggerFn({
      tool: tool('t', async () => null),
      args: {},
      error: new Error('x'),
      attempt: 0,
    })
    expect(result.args).toBeNull()
  })

  it('returns args: null when the upstream call throws', async () => {
    const debuggerFn = createLlmSelfDebugger(async () => {
      throw new Error('network down')
    })
    const result = await debuggerFn({
      tool: tool('t', async () => null),
      args: {},
      error: new Error('x'),
      attempt: 0,
    })
    expect(result.args).toBeNull()
    expect(result.reasoning).toContain('upstream')
  })

  it('end-to-end: debug + retry via the wrapper', async () => {
    const complete = vi.fn(async () => '{"n": 42}')
    const wrapped = wrapToolWithSelfDebug(
      tool('expect-42', async ({ n }) => {
        if (n !== 42) throw new Error('need 42')
        return 'ok'
      }),
      createLlmSelfDebugger(complete),
    )
    const result = await wrapped.execute!({ n: 0 }, ctx)
    expect(result).toBe('ok')
    expect(complete).toHaveBeenCalledOnce()
  })
})
