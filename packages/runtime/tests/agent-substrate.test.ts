import { describe, it, expect } from 'vitest'
import type { AdapterFactory, StreamChunk, ToolDefinition } from '@agentskit/core'
import { invokeStructured } from '../src/structured'
import { piiDenyValidator } from '../src/pii-validator'

// Minimal inline mock adapter — avoids a cross-package dep on @agentskit/adapters.
// Typed against AdapterFactory + StreamChunk so it stays in sync with the real
// contract (no `as unknown` escape hatch).
function mock(chunks: StreamChunk[]): AdapterFactory {
  const factory: AdapterFactory = {
    capabilities: { streaming: false, tools: true },
    createSource: () => ({
      // eslint-disable-next-line @typescript-eslint/require-await
      stream: async function* () {
        yield* chunks
      },
      abort: () => {},
    }),
  }
  return factory
}

describe('piiDenyValidator', () => {
  it('fails when output contains PII, passes when clean', async () => {
    const v = piiDenyValidator()
    const dirty = await v.check({ attempt: 0, output: 'reach me at jane@doe.com or 555-123-4567' })
    expect(dirty).toMatchObject({ ok: false })
    expect((dirty as { reason: string }).reason).toMatch(/email|phone/)
    expect(await v.check({ attempt: 0, output: 'no identifiers here' })).toMatchObject({ ok: true })
    expect(v.onFail).toBe('block')
  })

  it('uses the documented defaults and honors overrides', () => {
    const def = piiDenyValidator()
    expect(def.name).toBe('pii-deny')
    expect(def.onFail).toBe('block')
    const custom = piiDenyValidator({ name: 'no-pii', onFail: 'retry' })
    expect(custom.name).toBe('no-pii')
    expect(custom.onFail).toBe('retry')
  })
})

describe('invokeStructured', () => {
  const submit: ToolDefinition = { name: 'submit_x', description: 'submit', execute: async () => 'recorded' }
  const adapter = mock([
    { type: 'tool_call', toolCall: { id: 't', name: 'submit_x', args: JSON.stringify({ n: '42', label: 'ok' }) } },
    { type: 'done' },
  ])

  it('runs a skill, reads back the submit tool args, and returns parsed output', async () => {
    const out = await invokeStructured({
      adapter,
      tool: submit,
      task: 'do it',
      parse: (a) => ({ n: Number(a.n), label: String(a.label) }),
    })
    expect(out).toEqual({ n: 42, label: 'ok' })
  })

  it('throws if the skill never calls the submit tool', async () => {
    const silent = mock([{ type: 'text', content: 'no tool call' }, { type: 'done' }])
    await expect(
      invokeStructured({ adapter: silent, tool: submit, task: 'x', parse: (a) => a }),
    ).rejects.toThrow(/did not call submit_x/)
  })

  it('surfaces a parse failure on malformed submit args rather than returning garbage', async () => {
    const bad = mock([
      { type: 'tool_call', toolCall: { id: 't', name: 'submit_x', args: JSON.stringify({ n: 'not-a-number' }) } },
      { type: 'done' },
    ])
    await expect(
      invokeStructured({
        adapter: bad,
        tool: submit,
        task: 'x',
        parse: (a) => {
          const n = Number(a.n)
          if (Number.isNaN(n)) throw new Error('n is not a number')
          return { n }
        },
      }),
    ).rejects.toThrow(/not a number/)
  })
})
