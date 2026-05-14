import { describe, it, expect } from 'vitest'
import { shell } from '../src/shell'
import type { ToolCall } from '@agentskit/core'

const baseCall: ToolCall = { id: '1', name: 'shell', args: {}, status: 'running' }
const ctx = { messages: [], call: baseCall }

describe('shell', () => {
  it('satisfies ToolDefinition contract', () => {
    const tool = shell({ allowed: ['echo'] })
    expect(tool.name).toBe('shell')
    expect(tool.description).toBeTruthy()
    expect(tool.schema).toBeDefined()
    expect(tool.tags).toContain('shell')
    expect(tool.category).toBe('execution')
    expect(tool.execute).toBeTypeOf('function')
  })

  it('refuses to register with no allowlist (default-deny)', () => {
    expect(() => shell()).toThrow(/allowlist/)
  })

  it('permits allowAny opt-out', () => {
    expect(() => shell({ allowAny: true })).not.toThrow()
  })

  it('executes a simple command', async () => {
    const tool = shell({ allowed: ['echo'] })
    const result = await tool.execute!({ command: 'echo hello' }, ctx)
    expect(result).toContain('hello')
    expect(result).toContain('[exit code: 0]')
  })

  it('returns error for empty command', async () => {
    const tool = shell({ allowed: ['echo'] })
    const result = await tool.execute!({ command: '' }, ctx)
    expect(result).toContain('Error')
  })

  it('rejects commands not in allow list', async () => {
    const tool = shell({ allowed: ['ls', 'echo'] })
    const result = await tool.execute!({ command: 'rm /tmp/x' }, ctx)
    expect(result).toContain('not allowed')
    expect(result).toContain('ls, echo')
  })

  it('rejects shell metacharacter chaining (`;`)', async () => {
    const tool = shell({ allowed: ['ls', 'echo'] })
    const result = await tool.execute!({ command: 'ls; rm -rf /tmp/x' }, ctx)
    expect(result).toMatch(/shell metacharacters/)
  })

  it('rejects shell metacharacter chaining (`&&`)', async () => {
    const tool = shell({ allowed: ['ls', 'echo'] })
    const result = await tool.execute!({ command: 'ls && rm /tmp/x' }, ctx)
    expect(result).toMatch(/shell metacharacters/)
  })

  it('rejects pipe redirection', async () => {
    const tool = shell({ allowed: ['ls'] })
    const result = await tool.execute!({ command: 'ls | cat' }, ctx)
    expect(result).toMatch(/shell metacharacters/)
  })

  it('rejects command substitution `$()`', async () => {
    const tool = shell({ allowed: ['echo'] })
    const result = await tool.execute!({ command: 'echo $(whoami)' }, ctx)
    expect(result).toMatch(/shell metacharacters/)
  })

  it('rejects backtick substitution', async () => {
    const tool = shell({ allowed: ['echo'] })
    const result = await tool.execute!({ command: 'echo `whoami`' }, ctx)
    expect(result).toMatch(/shell metacharacters/)
  })

  it('rejects output redirection `>`', async () => {
    const tool = shell({ allowed: ['echo'] })
    const result = await tool.execute!({ command: 'echo hi > /tmp/x' }, ctx)
    expect(result).toMatch(/shell metacharacters/)
  })

  it('rejects glob `*`', async () => {
    const tool = shell({ allowed: ['ls'] })
    const result = await tool.execute!({ command: 'ls *.ts' }, ctx)
    expect(result).toMatch(/shell metacharacters/)
  })

  it('allowlist cannot be bypassed by metachar prefix', async () => {
    // First word "echo" looks allowed; metachar guard fires before allowlist check.
    const tool = shell({ allowed: ['echo'] })
    const result = await tool.execute!({ command: 'echo a; echo b' }, ctx)
    expect(result).toMatch(/shell metacharacters/)
  })

  it('enforces timeout', async () => {
    const tool = shell({ allowed: ['sleep'], timeout: 200 })
    const result = await tool.execute!({ command: 'sleep 30' }, ctx)
    expect(result).toContain('timed out')
  }, 5_000)
})
