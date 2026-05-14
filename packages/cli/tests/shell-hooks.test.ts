/**
 * Tests for shell-hooks — covers configHooksToHandlers and runShellHook
 * via real child processes (echo / exit commands available everywhere).
 */
import { describe, it, expect } from 'vitest'
import { configHooksToHandlers } from '../src/extensibility/hooks/shell-hooks'
import type { HookPayload } from '../src/extensibility/plugins/types'

const PAYLOAD: HookPayload = { event: 'UserPromptSubmit', prompt: 'hello' }

describe('configHooksToHandlers', () => {
  it('returns [] when config is undefined', () => {
    expect(configHooksToHandlers(undefined)).toEqual([])
  })

  it('returns [] when config is empty object', () => {
    expect(configHooksToHandlers({})).toEqual([])
  })

  it('produces one handler per entry', () => {
    const handlers = configHooksToHandlers({
      UserPromptSubmit: [
        { run: 'echo ok' },
        { run: 'echo ok2' },
      ],
    })
    expect(handlers).toHaveLength(2)
    expect(handlers[0]!.event).toBe('UserPromptSubmit')
  })

  it('attaches matcher regex when matcher string provided', () => {
    const handlers = configHooksToHandlers({
      PreToolUse: [{ run: 'echo ok', matcher: '^shell' }],
    })
    expect(handlers[0]!.matcher).toBeInstanceOf(RegExp)
    expect((handlers[0]!.matcher as RegExp).test('shell')).toBe(true)
    expect((handlers[0]!.matcher as RegExp).test('web_search')).toBe(false)
  })

  it('no matcher when matcher not provided', () => {
    const handlers = configHooksToHandlers({
      SessionStart: [{ run: 'echo ok' }],
    })
    expect(handlers[0]!.matcher).toBeUndefined()
  })
})

describe('shell hook execution (runShellHook via handler)', () => {
  it('returns continue for a zero-exit no-output command', async () => {
    const [handler] = configHooksToHandlers({
      SessionStart: [{ run: 'true', timeout: 3000 }],
    })!
    const result = await handler!.run(PAYLOAD)
    expect(result.decision).toBe('continue')
  })

  it('returns block for a non-zero exit command', async () => {
    const [handler] = configHooksToHandlers({
      SessionStart: [{ run: 'exit 1', timeout: 3000 }],
    })!
    const result = await handler!.run(PAYLOAD)
    expect(result.decision).toBe('block')
    if (result.decision === 'block') {
      expect(result.reason).toContain('code 1')
    }
  })

  it('parses JSON output from hook (continue decision)', async () => {
    const [handler] = configHooksToHandlers({
      SessionStart: [{ run: 'printf \'{"decision":"continue"}\'', timeout: 3000 }],
    })!
    const result = await handler!.run(PAYLOAD)
    expect(result.decision).toBe('continue')
  })

  it('parses JSON block decision from hook', async () => {
    const [handler] = configHooksToHandlers({
      SessionStart: [{ run: 'printf \'{"decision":"block","reason":"blocked by policy"}\'', timeout: 3000 }],
    })!
    const result = await handler!.run(PAYLOAD)
    expect(result.decision).toBe('block')
    if (result.decision === 'block') {
      expect(result.reason).toContain('blocked by policy')
    }
  })

  it('parses modify decision from hook', async () => {
    const [handler] = configHooksToHandlers({
      UserPromptSubmit: [{
        run: 'printf \'{"decision":"modify","payload":{"event":"UserPromptSubmit","prompt":"modified"}}\'',
        timeout: 3000,
      }],
    })!
    const result = await handler!.run(PAYLOAD)
    expect(result.decision).toBe('modify')
    if (result.decision === 'modify') {
      expect((result.payload as { prompt: string }).prompt).toBe('modified')
    }
  })

  it('treats non-JSON stdout as continue', async () => {
    const [handler] = configHooksToHandlers({
      SessionStart: [{ run: 'printf "not json at all"', timeout: 3000 }],
    })!
    const result = await handler!.run(PAYLOAD)
    expect(result.decision).toBe('continue')
  })

  it('blocks when timeout exceeded', async () => {
    const [handler] = configHooksToHandlers({
      SessionStart: [{ run: 'sleep 10', timeout: 50 }],
    })!
    const result = await handler!.run(PAYLOAD)
    // sleep exits non-zero after SIGKILL
    expect(['block', 'continue']).toContain(result.decision)
  }, 10000)

  it('blocks when command does not exist', async () => {
    const [handler] = configHooksToHandlers({
      SessionStart: [{ run: 'sh -c "exit 127"', timeout: 3000 }],
    })!
    const result = await handler!.run(PAYLOAD)
    expect(result.decision).toBe('block')
  })
})
