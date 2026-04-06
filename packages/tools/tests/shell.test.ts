import { describe, it, expect } from 'vitest'
import { shell } from '../src/shell'
import type { ToolCall } from '@agentskit/core'

const baseCall: ToolCall = { id: '1', name: 'shell', args: {}, status: 'running' }
const ctx = { messages: [], call: baseCall }

describe('shell', () => {
  it('satisfies ToolDefinition contract', () => {
    const tool = shell()
    expect(tool.name).toBe('shell')
    expect(tool.description).toBeTruthy()
    expect(tool.schema).toBeDefined()
    expect(tool.tags).toContain('shell')
    expect(tool.category).toBe('execution')
    expect(tool.execute).toBeTypeOf('function')
  })

  it('executes a simple command', async () => {
    const tool = shell()
    const result = await tool.execute!({ command: 'echo hello' }, ctx)
    expect(result).toContain('hello')
    expect(result).toContain('[exit code: 0]')
  })

  it('captures stderr on non-zero exit', async () => {
    const tool = shell()
    const result = await tool.execute!({ command: 'echo error >&2 && exit 1' }, ctx)
    expect(result).toContain('[stderr]')
    expect(result).toContain('error')
    expect(result).toContain('[exit code: 1]')
  })

  it('returns error for empty command', async () => {
    const tool = shell()
    const result = await tool.execute!({ command: '' }, ctx)
    expect(result).toContain('Error')
  })

  it('rejects commands not in allow list', async () => {
    const tool = shell({ allowed: ['ls', 'echo'] })
    const result = await tool.execute!({ command: 'rm -rf /' }, ctx)
    expect(result).toContain('not allowed')
    expect(result).toContain('ls, echo')
  })

  it('allows commands in allow list', async () => {
    const tool = shell({ allowed: ['echo'] })
    const result = await tool.execute!({ command: 'echo allowed' }, ctx)
    expect(result).toContain('allowed')
    expect(result).toContain('[exit code: 0]')
  })

  it('enforces timeout', async () => {
    const tool = shell({ timeout: 200 })
    const result = await tool.execute!({ command: 'sleep 30' }, ctx)
    expect(result).toContain('timed out')
  }, 5_000)

  it('reports non-zero exit code', async () => {
    const tool = shell()
    const result = await tool.execute!({ command: 'exit 42' }, ctx)
    expect(result).toContain('[exit code: 42]')
  })
})
