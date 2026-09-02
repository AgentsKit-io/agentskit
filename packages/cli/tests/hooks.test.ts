import { describe, expect, it } from 'vitest'
import { HookDispatcher } from '../src/extensibility/hooks'
import { configHooksToHandlers } from '../src/extensibility/hooks'
import type { HookHandler } from '../src/extensibility/plugins'

describe('HookDispatcher', () => {
  it('runs handlers in order and returns continue by default', async () => {
    const calls: string[] = []
    const handlers: HookHandler[] = [
      {
        event: 'SessionStart',
        run: async () => {
          calls.push('a')
          return { decision: 'continue' }
        },
      },
      {
        event: 'SessionStart',
        run: async () => {
          calls.push('b')
          return { decision: 'continue' }
        },
      },
    ]
    const dispatcher = new HookDispatcher(handlers)
    const result = await dispatcher.dispatch('SessionStart', { event: 'SessionStart' })
    expect(calls).toEqual(['a', 'b'])
    expect(result.blocked).toBe(false)
  })

  it('stops dispatch on first block', async () => {
    const calls: string[] = []
    const handlers: HookHandler[] = [
      {
        event: 'UserPromptSubmit',
        run: async () => {
          calls.push('before')
          return { decision: 'block', reason: 'nope' }
        },
      },
      {
        event: 'UserPromptSubmit',
        run: async () => {
          calls.push('after')
          return { decision: 'continue' }
        },
      },
    ]
    const dispatcher = new HookDispatcher(handlers)
    const result = await dispatcher.dispatch('UserPromptSubmit', {
      event: 'UserPromptSubmit',
      prompt: 'hi',
    })
    expect(calls).toEqual(['before'])
    expect(result.blocked).toBe(true)
    expect(result.reason).toBe('nope')
  })

  it('threads modified payload through subsequent handlers', async () => {
    const handlers: HookHandler[] = [
      {
        event: 'UserPromptSubmit',
        run: async (payload) => ({
          decision: 'modify',
          payload: { ...payload, prompt: `${payload.prompt} (mod)` },
        }),
      },
    ]
    const dispatcher = new HookDispatcher(handlers)
    const result = await dispatcher.dispatch('UserPromptSubmit', {
      event: 'UserPromptSubmit',
      prompt: 'hi',
    })
    expect(result.payload.prompt).toBe('hi (mod)')
  })

  it('respects matcher filters', async () => {
    const calls: string[] = []
    const handlers: HookHandler[] = [
      {
        event: 'PreToolUse',
        matcher: /shell|fs_write/,
        run: async (p) => {
          calls.push(String(p.tool))
          return { decision: 'continue' }
        },
      },
    ]
    const dispatcher = new HookDispatcher(handlers)
    await dispatcher.dispatch('PreToolUse', { event: 'PreToolUse', tool: 'shell' })
    await dispatcher.dispatch('PreToolUse', { event: 'PreToolUse', tool: 'web_search' })
    expect(calls).toEqual(['shell'])
  })

  it('isolates handler throws via onError', async () => {
    const errors: unknown[] = []
    const dispatcher = new HookDispatcher(
      [
        {
          event: 'SessionStart',
          run: () => {
            throw new Error('boom')
          },
        },
        {
          event: 'SessionStart',
          run: async () => ({ decision: 'continue' }),
        },
      ],
      (_h, err) => errors.push(err),
    )
    const result = await dispatcher.dispatch('SessionStart', { event: 'SessionStart' })
    expect(errors).toHaveLength(1)
    expect(result.blocked).toBe(true)
  })
})

describe('shell hooks', () => {
  it('blocks unbounded stdout instead of retaining it', async () => {
    const [handler] = configHooksToHandlers({
      SessionStart: [{ run: `node -e "process.stdout.write('x'.repeat(100000))"` }],
    })
    const result = await handler!.run({ event: 'SessionStart' })
    expect(result).toMatchObject({ decision: 'block' })
    expect((result as { reason?: string }).reason).toContain('output exceeded')
  }, 10_000)
})
