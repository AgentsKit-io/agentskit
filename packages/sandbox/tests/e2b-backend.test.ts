import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createE2BBackend } from '../src/e2b-backend'

interface FakeSandbox {
  runCode: ReturnType<typeof vi.fn>
  kill: ReturnType<typeof vi.fn>
}

let fakeSandbox: FakeSandbox

beforeEach(() => {
  fakeSandbox = {
    runCode: vi.fn(async (_code: string, opts?: {
      onStdout?: (d: { line: string }) => void
      onStderr?: (d: { line: string }) => void
    }) => {
      opts?.onStdout?.({ line: 'hello' })
      opts?.onStderr?.({ line: 'warn' })
      return { exitCode: 0 }
    }),
    kill: vi.fn(async () => undefined),
  }
  vi.doMock('@e2b/code-interpreter', () => ({
    Sandbox: { create: vi.fn(async () => fakeSandbox) },
  }))
})

afterEach(() => {
  vi.doUnmock('@e2b/code-interpreter')
  vi.resetModules()
})

describe('createE2BBackend', () => {
  it('dispose is a no-op when never instantiated', async () => {
    const backend = createE2BBackend({ apiKey: 'sk-test' })
    await expect(backend.dispose()).resolves.toBeUndefined()
  })

  it('execute streams stdout/stderr and returns exit code', async () => {
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    const result = await backend.execute('print(1)', { language: 'python' })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('hello')
    expect(result.stderr).toBe('warn')
    expect(typeof result.durationMs).toBe('number')
    expect(fakeSandbox.runCode).toHaveBeenCalledWith(
      'print(1)',
      expect.objectContaining({ language: 'python' }),
    )
  })

  it('default language is javascript', async () => {
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    await backend.execute('1+1')
    expect(fakeSandbox.runCode).toHaveBeenCalledWith(
      '1+1',
      expect.objectContaining({ language: 'javascript' }),
    )
  })

  it('reuses sandbox instance across calls', async () => {
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    await backend.execute('a')
    await backend.execute('b')
    expect(fakeSandbox.runCode).toHaveBeenCalledTimes(2)
  })

  it('dispose kills the sandbox', async () => {
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    await backend.execute('a')
    await backend.dispose()
    expect(fakeSandbox.kill).toHaveBeenCalled()
  })

  it('execute timeout returns exitCode 1 with timeout message', async () => {
    fakeSandbox.runCode = vi.fn(() => new Promise(() => undefined))
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    const result = await backend.execute('sleep', { timeout: 30 })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/timed out/)
  })

  it('captures runtime errors as exitCode 1', async () => {
    fakeSandbox.runCode = vi.fn(async () => {
      throw new Error('runtime explosion')
    })
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    const result = await backend.execute('boom')
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/runtime explosion/)
  })
})
