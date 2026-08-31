import { describe, expect, it } from 'vitest'
import { wrapObserverWithRedaction } from '../src/redaction'
import {
  createInMemoryRedactionVault,
  DEFAULT_PII_RULES,
} from '@agentskit/core/security'
import type { AgentEvent, Observer } from '@agentskit/core'

function spyObserver(): { obs: Observer; events: AgentEvent[] } {
  const events: AgentEvent[] = []
  const obs: Observer = {
    name: 'spy',
    on: e => { events.push(e) },
  }
  return { obs, events }
}

describe('wrapObserverWithRedaction — redact mode', () => {
  it('redacts llm:end content', async () => {
    const { obs, events } = spyObserver()
    const wrapped = wrapObserverWithRedaction(obs, { rules: DEFAULT_PII_RULES })
    await wrapped.on({
      type: 'llm:end',
      content: 'reach me at alice@example.com',
      durationMs: 12,
    })
    expect((events[0] as { content: string }).content).toContain('[REDACTED_EMAIL]')
  })

  it('redacts tool:end result', async () => {
    const { obs, events } = spyObserver()
    const wrapped = wrapObserverWithRedaction(obs, { rules: DEFAULT_PII_RULES })
    await wrapped.on({
      type: 'tool:end',
      name: 'sql',
      result: 'row: alice@example.com',
      durationMs: 4,
    })
    expect((events[0] as { result: string }).result).toContain('[REDACTED_EMAIL]')
  })

  it('redacts string fields inside tool:start args (deep)', async () => {
    const { obs, events } = spyObserver()
    const wrapped = wrapObserverWithRedaction(obs, { rules: DEFAULT_PII_RULES })
    await wrapped.on({
      type: 'tool:start',
      name: 'send_email',
      args: { to: 'alice@example.com', subject: 'hi', cc: ['bob@b.co'] },
    })
    const args = (events[0] as { args: Record<string, unknown> }).args
    expect(args.to).toContain('[REDACTED_EMAIL]')
    expect((args.cc as string[])[0]).toContain('[REDACTED_EMAIL]')
    expect(args.subject).toBe('hi')
  })

  it('bounds circular and deeply nested tool arguments', async () => {
    const { obs, events } = spyObserver()
    const wrapped = wrapObserverWithRedaction(obs, { rules: DEFAULT_PII_RULES })
    const args: Record<string, unknown> = {}
    args.self = args
    let deep: Record<string, unknown> = args
    for (let i = 0; i < 40; i++) deep = deep.next = {}
    await wrapped.on({ type: 'tool:start', name: 'inspect', args })
    const safe = (events[0] as { args: Record<string, unknown> }).args
    expect(safe.self).toBe('[Circular]')
  })

  it('redacts agent:delegate:end result', async () => {
    const { obs, events } = spyObserver()
    const wrapped = wrapObserverWithRedaction(obs, { rules: DEFAULT_PII_RULES })
    await wrapped.on({
      type: 'agent:delegate:end',
      name: 'researcher',
      result: 'found alice@example.com',
      durationMs: 100,
      depth: 1,
    })
    expect((events[0] as { result: string }).result).toContain('[REDACTED_EMAIL]')
  })

  it('redacts error.message, preserves name AND propagates stack with redaction', async () => {
    const { obs, events } = spyObserver()
    const wrapped = wrapObserverWithRedaction(obs, { rules: DEFAULT_PII_RULES })
    const original = new Error('SMTP failed for alice@example.com')
    original.name = 'SMTPAuthError'
    await wrapped.on({ type: 'error', error: original })
    const fwd = (events[0] as { error: Error }).error
    expect(fwd.message).toContain('[REDACTED_EMAIL]')
    expect(fwd.name).toBe('SMTPAuthError')
    // Stack survives AND the PII inside the stack is rewritten.
    expect(fwd.stack).toBeTruthy()
    expect(fwd.stack).not.toContain('alice@example.com')
    expect(fwd.stack).toContain('[REDACTED_EMAIL]')
  })

  it('passes structural events through unchanged', async () => {
    const { obs, events } = spyObserver()
    const wrapped = wrapObserverWithRedaction(obs, { rules: DEFAULT_PII_RULES })
    await wrapped.on({ type: 'llm:start', model: 'gpt-5', messageCount: 4 })
    await wrapped.on({ type: 'llm:first-token', latencyMs: 200 })
    await wrapped.on({ type: 'memory:save', messageCount: 2 })
    expect(events).toHaveLength(3)
    expect((events[0] as { model: string }).model).toBe('gpt-5')
    expect((events[2] as { messageCount: number }).messageCount).toBe(2)
  })

  it('renames the wrapped observer for traceability', () => {
    const { obs } = spyObserver()
    const wrapped = wrapObserverWithRedaction(obs, { rules: DEFAULT_PII_RULES })
    expect(wrapped.name).toBe('redacted(spy)')
  })
})

describe('wrapObserverWithRedaction — tokenize mode', () => {
  it('tokenizes llm:end content + stores originals in vault', async () => {
    const { obs, events } = spyObserver()
    const vault = createInMemoryRedactionVault()
    const wrapped = wrapObserverWithRedaction(obs, {
      rules: DEFAULT_PII_RULES,
      mode: 'tokenize',
      vault,
      allowedRoles: ['oncall'],
    })
    await wrapped.on({
      type: 'llm:end',
      content: 'wrote to alice@example.com',
      durationMs: 8,
    })
    const out = (events[0] as { content: string }).content
    expect(out).toMatch(/<<piitoken:[a-f0-9]{32}>>/)
    expect(out).not.toContain('alice@example.com')
  })

  it('throws when vault missing in tokenize mode', async () => {
    const { obs } = spyObserver()
    const wrapped = wrapObserverWithRedaction(obs, {
      rules: DEFAULT_PII_RULES,
      mode: 'tokenize',
      allowedRoles: ['x'],
    })
    await expect(
      wrapped.on({ type: 'tool:end', name: 't', result: 'a@b.co', durationMs: 1 }),
    ).rejects.toThrow(/vault is required/)
  })
})
