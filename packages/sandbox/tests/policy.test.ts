import { describe, expect, it, vi } from 'vitest'
import type { ToolDefinition } from '@agentskit/core'
import { createMandatorySandbox, type PolicyEvent, type SandboxPolicy } from '../src/policy'

function makeTool(name: string, run: (args: Record<string, unknown>) => unknown | Promise<unknown> = () => 'ok'): ToolDefinition {
  return { name, description: name, execute: async args => run(args) }
}

const sandbox: ToolDefinition = {
  name: 'code_execution',
  description: 'sandbox',
  execute: async args => `sandboxed:${JSON.stringify(args)}`,
}

const stubCtx = { messages: [], call: { id: 'c', name: 'x', args: {}, status: 'running' as const } }

describe('createMandatorySandbox', () => {
  it('passes through tools not in require/deny/allow lists', async () => {
    const m = createMandatorySandbox({ sandbox, policy: {} })
    const wrapped = m.wrap(makeTool('echo'))
    const result = await wrapped.execute!({ x: 1 }, stubCtx)
    expect(result).toBe('ok')
  })

  it('routes require-listed tools through the sandbox and skips the original body', async () => {
    const original = vi.fn(() => 'raw')
    const m = createMandatorySandbox({
      sandbox,
      policy: { requireSandbox: ['shell'] },
    })
    const wrapped = m.wrap(makeTool('shell', original))
    const result = await wrapped.execute!({ cmd: 'ls' }, stubCtx)
    expect(result).toContain('sandboxed:')
    expect(result).toContain('cmd')
    expect(original).not.toHaveBeenCalled()
  })

  it('deny-listed tool throws', async () => {
    const m = createMandatorySandbox({
      sandbox,
      policy: { deny: ['filesystem'] },
    })
    const wrapped = m.wrap(makeTool('filesystem'))
    await expect(wrapped.execute!({}, stubCtx)).rejects.toThrow(/denied/)
  })

  it('allow-list rejects everything else', async () => {
    const m = createMandatorySandbox({
      sandbox,
      policy: { allow: ['search'] },
    })
    const good = m.wrap(makeTool('search'))
    const bad = m.wrap(makeTool('delete'))
    expect(await good.execute!({}, stubCtx)).toBe('ok')
    await expect(bad.execute!({}, stubCtx)).rejects.toThrow(/not-in-allow-list/)
  })

  it('requireSandbox "*" forces all tools into sandbox', async () => {
    const m = createMandatorySandbox({ sandbox, policy: { requireSandbox: '*' } })
    const wrapped = m.wrap(makeTool('any'))
    const result = await wrapped.execute!({}, stubCtx)
    expect(result).toContain('sandboxed:')
  })

  it('validator throwing aborts the call', async () => {
    const m = createMandatorySandbox({
      sandbox,
      policy: {
        validators: {
          search: args => {
            if (typeof args.q !== 'string') throw new Error('q required')
          },
        },
      },
    })
    const wrapped = m.wrap(makeTool('search'))
    await expect(wrapped.execute!({}, stubCtx)).rejects.toThrow(/q required/)
  })

  it('validator passing lets the call through', async () => {
    const m = createMandatorySandbox({
      sandbox,
      policy: {
        validators: {
          search: args => {
            if (!args.q) throw new Error('q required')
          },
        },
      },
    })
    const wrapped = m.wrap(makeTool('search', args => `hit:${args.q}`))
    expect(await wrapped.execute!({ q: 'hi' }, stubCtx)).toBe('hit:hi')
  })

  it('check reports allowed / mustSandbox without wrapping', () => {
    const m = createMandatorySandbox({
      sandbox,
      policy: { requireSandbox: ['shell'], deny: ['filesystem'] },
    })
    expect(m.check(makeTool('other')).allowed).toBe(true)
    expect(m.check(makeTool('shell')).mustSandbox).toBe(true)
    expect(m.check(makeTool('filesystem')).allowed).toBe(false)
  })

  it('onPolicyEvent fires decisions', async () => {
    const events: PolicyEvent[] = []
    const m = createMandatorySandbox({
      sandbox,
      policy: {
        requireSandbox: ['shell'],
        deny: ['filesystem'],
        onPolicyEvent: e => events.push(e),
      },
    })
    m.wrap(makeTool('shell'))
    m.wrap(makeTool('filesystem'))
    m.wrap(makeTool('benign'))
    expect(events.map(e => e.type)).toEqual(['sandbox-required', 'deny', 'allow'])
  })

  it('throws when required sandbox tool lacks an execute function', async () => {
    const brokenSandbox: ToolDefinition = { name: 'code_execution', description: 'x' }
    const m = createMandatorySandbox({
      sandbox: brokenSandbox,
      policy: { requireSandbox: '*' },
    })
    const wrapped = m.wrap(makeTool('any'))
    await expect(wrapped.execute!({}, stubCtx)).rejects.toThrow(/no execute function/)
  })

  it('snapshots policy arrays so post-create mutations do not change decisions', async () => {
    const deny = ['filesystem']
    const policy: SandboxPolicy = { deny }
    const m = createMandatorySandbox({ sandbox, policy })
    deny.push('search')
    // search was not denied at create time
    const wrapped = m.wrap(makeTool('search'))
    expect(await wrapped.execute!({}, stubCtx)).toBe('ok')
    // filesystem still denied from snapshot
    await expect(m.wrap(makeTool('filesystem')).execute!({}, stubCtx)).rejects.toThrow(/denied/)
  })
})
