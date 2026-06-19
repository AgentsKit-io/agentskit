import { describe, it, expect } from 'vitest'
import type { AdapterFactory, ToolDefinition } from '@agentskit/core'
import { invokeStructured } from '../src/structured'
import { piiDenyValidator } from '../src/pii-validator'

// Minimal inline mock adapter — avoids a cross-package dep on @agentskit/adapters.
type Chunk = Record<string, unknown>
function mock(chunks: Chunk[]): AdapterFactory {
  return {
    capabilities: { streaming: false, tools: true },
    createSource: () => ({
      // eslint-disable-next-line @typescript-eslint/require-await
      stream: async function* () {
        for (const c of chunks) yield c as never
      },
      abort: () => {},
    }),
  } as unknown as AdapterFactory
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
})
