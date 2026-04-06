import { describe, it, expect, vi } from 'vitest'
import { createSandbox } from '../src/sandbox'
import { sandboxTool } from '../src/tool'
import type { SandboxBackend, ExecuteOptions, ExecuteResult } from '../src/types'

function createMockBackend(results?: Partial<ExecuteResult>): SandboxBackend {
  return {
    execute: vi.fn().mockResolvedValue({
      stdout: results?.stdout ?? 'hello',
      stderr: results?.stderr ?? '',
      exitCode: results?.exitCode ?? 0,
      durationMs: results?.durationMs ?? 50,
    }),
    dispose: vi.fn(),
  }
}

describe('createSandbox', () => {
  it('executes code via backend', async () => {
    const backend = createMockBackend()
    const sandbox = createSandbox({ backend })

    const result = await sandbox.execute('console.log("hi")')
    expect(result.stdout).toBe('hello')
    expect(result.exitCode).toBe(0)
    expect(backend.execute).toHaveBeenCalledWith('console.log("hi")', expect.objectContaining({
      language: 'javascript',
      timeout: 30_000,
      network: false,
    }))
  })

  it('applies security defaults', async () => {
    const backend = createMockBackend()
    const sandbox = createSandbox({ backend })

    await sandbox.execute('test')
    expect(backend.execute).toHaveBeenCalledWith('test', expect.objectContaining({
      language: 'javascript',
      timeout: 30_000,
      network: false,
      memoryLimit: '50MB',
    }))
  })

  it('allows option overrides', async () => {
    const backend = createMockBackend()
    const sandbox = createSandbox({ backend, language: 'python', timeout: 10_000 })

    await sandbox.execute('print(1)', { language: 'javascript', timeout: 5_000 })
    expect(backend.execute).toHaveBeenCalledWith('print(1)', expect.objectContaining({
      language: 'javascript',
      timeout: 5_000,
    }))
  })

  it('uses config defaults when no overrides', async () => {
    const backend = createMockBackend()
    const sandbox = createSandbox({ backend, language: 'python', timeout: 10_000, network: true })

    await sandbox.execute('print(1)')
    expect(backend.execute).toHaveBeenCalledWith('print(1)', expect.objectContaining({
      language: 'python',
      timeout: 10_000,
      network: true,
    }))
  })

  it('dispose calls backend dispose', async () => {
    const backend = createMockBackend()
    const sandbox = createSandbox({ backend })

    await sandbox.dispose()
    expect(backend.dispose).toHaveBeenCalled()
  })

  it('throws if no apiKey and no backend', () => {
    const sandbox = createSandbox({})
    expect(sandbox.execute('test')).rejects.toThrow('apiKey')
  })

  it('handles backend errors gracefully', async () => {
    const backend: SandboxBackend = {
      execute: vi.fn().mockRejectedValue(new Error('VM crashed')),
    }
    const sandbox = createSandbox({ backend })

    await expect(sandbox.execute('bad code')).rejects.toThrow('VM crashed')
  })

  it('returns stderr on non-zero exit', async () => {
    const backend = createMockBackend({ stdout: '', stderr: 'SyntaxError', exitCode: 1 })
    const sandbox = createSandbox({ backend })

    const result = await sandbox.execute('bad syntax')
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('SyntaxError')
  })
})

describe('sandboxTool', () => {
  it('satisfies ToolDefinition contract', () => {
    const tool = sandboxTool({ backend: createMockBackend() })
    expect(tool.name).toBe('code_execution')
    expect(tool.description).toBeTruthy()
    expect(tool.schema).toBeDefined()
    expect(tool.tags).toContain('sandbox')
    expect(tool.category).toBe('execution')
    expect(tool.execute).toBeTypeOf('function')
    expect(tool.init).toBeTypeOf('function')
    expect(tool.dispose).toBeTypeOf('function')
  })

  it('executes code and returns formatted output', async () => {
    const backend = createMockBackend({ stdout: 'hello world', stderr: '', exitCode: 0 })
    const tool = sandboxTool({ backend })

    const result = await tool.execute!(
      { code: 'console.log("hello world")' },
      { messages: [], call: { id: '1', name: 'code_execution', args: {}, status: 'running' } },
    )

    expect(result).toContain('hello world')
    expect(result).toContain('[exit code: 0]')
  })

  it('shows stderr in output', async () => {
    const backend = createMockBackend({ stdout: '', stderr: 'Error: bad', exitCode: 1 })
    const tool = sandboxTool({ backend })

    const result = await tool.execute!(
      { code: 'throw new Error("bad")' },
      { messages: [], call: { id: '1', name: 'code_execution', args: {}, status: 'running' } },
    )

    expect(result).toContain('[stderr]')
    expect(result).toContain('Error: bad')
    expect(result).toContain('[exit code: 1]')
  })

  it('returns error for empty code', async () => {
    const tool = sandboxTool({ backend: createMockBackend() })

    const result = await tool.execute!(
      { code: '' },
      { messages: [], call: { id: '1', name: 'code_execution', args: {}, status: 'running' } },
    )

    expect(result).toContain('Error')
  })

  it('passes language option', async () => {
    const backend = createMockBackend()
    const tool = sandboxTool({ backend })

    await tool.execute!(
      { code: 'print(1)', language: 'python' },
      { messages: [], call: { id: '1', name: 'code_execution', args: {}, status: 'running' } },
    )

    expect(backend.execute).toHaveBeenCalledWith('print(1)', expect.objectContaining({
      language: 'python',
    }))
  })

  it('dispose cleans up sandbox', async () => {
    const backend = createMockBackend()
    const tool = sandboxTool({ backend })

    await tool.dispose!()
    expect(backend.dispose).toHaveBeenCalled()
  })
})
