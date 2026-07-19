import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SandboxError } from '@agentskit/core'

interface FakeSandbox {
  runCode: ReturnType<typeof vi.fn>
  kill: ReturnType<typeof vi.fn>
}

let fakeSandbox: FakeSandbox
let createMock: ReturnType<typeof vi.fn>

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
  createMock = vi.fn(async (opts: unknown) => {
    void opts
    return fakeSandbox
  })
  vi.doMock('@e2b/code-interpreter', () => ({
    Sandbox: { create: createMock },
  }))
})

afterEach(() => {
  vi.doUnmock('@e2b/code-interpreter')
  vi.resetModules()
})

describe('createE2BBackend', () => {
  it('rejects empty apiKey', async () => {
    const { createE2BBackend } = await import('../src/e2b-backend')
    expect(() => createE2BBackend({ apiKey: '  ' })).toThrow(/apiKey/)
    expect(() => createE2BBackend({ apiKey: '' })).toThrow(SandboxError)
  })

  it('rejects non-positive timeout', async () => {
    const { createE2BBackend } = await import('../src/e2b-backend')
    expect(() => createE2BBackend({ apiKey: 'sk-test', timeout: 0 })).toThrow(/timeout/)
    expect(() => createE2BBackend({ apiKey: 'sk-test', timeout: NaN })).toThrow(/timeout/)
    expect(() => createE2BBackend({ apiKey: 'sk-test', timeout: -1 })).toThrow(/timeout/)
  })

  it('passes timeoutMs and allowInternetAccess:false by default to Sandbox.create', async () => {
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test', timeout: 120_000 })
    await backend.execute('1')
    expect(createMock).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      timeoutMs: 120_000,
      allowInternetAccess: false,
    })
  })

  it('passes allowInternetAccess:true when network is enabled', async () => {
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test', network: true })
    await backend.execute('1')
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ allowInternetAccess: true }),
    )
  })

  it('dispose is a no-op when never instantiated', async () => {
    const { createE2BBackend } = await import('../src/e2b-backend')
    const backend = createE2BBackend({ apiKey: 'sk-test' })
    await expect(backend.dispose()).resolves.toBeUndefined()
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
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it('serialize concurrent init to a single create', async () => {
    let resolveCreate!: (v: FakeSandbox) => void
    createMock.mockImplementationOnce(
      () =>
        new Promise<FakeSandbox>((resolve) => {
          resolveCreate = resolve
        }),
    )
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    const p1 = backend.execute('a')
    const p2 = backend.execute('b')
    await vi.waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
    })
    resolveCreate(fakeSandbox)
    await Promise.all([p1, p2])
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it('dispose kills the sandbox and is idempotent', async () => {
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    await backend.execute('a')
    await backend.dispose()
    await backend.dispose()
    expect(fakeSandbox.kill).toHaveBeenCalledTimes(1)
  })

  it('execute after dispose throws deterministically', async () => {
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    await backend.dispose()
    await expect(backend.execute('x')).rejects.toThrow(/disposed/)
  })

  it('dispose during init kills the orphan VM', async () => {
    let resolveCreate!: (v: FakeSandbox) => void
    createMock.mockImplementationOnce(
      () =>
        new Promise<FakeSandbox>((resolve) => {
          resolveCreate = resolve
        }),
    )
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    const execPromise = backend.execute('a')
    await vi.waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
    })
    const disposePromise = backend.dispose()
    resolveCreate(fakeSandbox)
    await disposePromise
    await expect(execPromise).rejects.toThrow(/disposed/)
    expect(fakeSandbox.kill).toHaveBeenCalled()
  })

  it('execute timeout kills and resets the VM', async () => {
    fakeSandbox.runCode = vi.fn(() => new Promise(() => undefined))
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    const result = await backend.execute('sleep', { timeout: 30 })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/timed out/)
    expect(fakeSandbox.kill).toHaveBeenCalled()
    // next execute recreates
    fakeSandbox.runCode = vi.fn(async () => ({ exitCode: 0 }))
    await backend.execute('next')
    expect(createMock).toHaveBeenCalledTimes(2)
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

  it('does not classify E2B backend errors as peer missing just because message mentions @e2b', async () => {
    createMock.mockRejectedValueOnce(new Error('auth failed for @e2b/code-interpreter account'))
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    await expect(backend.execute('x')).rejects.toMatchObject({
      name: 'SandboxError',
      code: 'AK_SANDBOX_BACKEND_FAILED',
    })
  })

  it('classifies genuine module-not-found as peer missing', async () => {
    const { isE2BPeerMissingError } = await import('../src/e2b-backend')
    const peerErr = Object.assign(new Error("Cannot find module '@e2b/code-interpreter'"), {
      code: 'ERR_MODULE_NOT_FOUND',
    })
    expect(isE2BPeerMissingError(peerErr)).toBe(true)
    expect(isE2BPeerMissingError(new Error('auth failed for @e2b/code-interpreter account'))).toBe(
      false,
    )

    vi.doUnmock('@e2b/code-interpreter')
    vi.resetModules()
    vi.doMock('@e2b/code-interpreter', () => {
      throw Object.assign(new Error("Cannot find module '@e2b/code-interpreter'"), {
        code: 'ERR_MODULE_NOT_FOUND',
      })
    })
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    await expect(backend.execute('x')).rejects.toMatchObject({
      code: 'AK_SANDBOX_PEER_MISSING',
    })
  })

  it('caps combined stdout+stderr by bytes', async () => {
    fakeSandbox.runCode = vi.fn(async (_code: string, opts?: {
      onStdout?: (d: { line: string }) => void
      onStderr?: (d: { line: string }) => void
    }) => {
      opts?.onStdout?.({ line: 'x'.repeat(80) })
      opts?.onStderr?.({ line: 'y'.repeat(80) })
      return { exitCode: 0 }
    })
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test', maxOutputBytes: 50 })
    const result = await backend.execute('big')
    const total = Buffer.byteLength(result.stdout, 'utf8') + Buffer.byteLength(result.stderr, 'utf8')
    // stderr may include truncation notice; captured body is capped
    expect(result.stderr).toMatch(/truncated/)
    expect(total).toBeGreaterThan(0)
  })

  it('rejects invalid execute timeout', async () => {
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    await expect(backend.execute('x', { timeout: 0 })).rejects.toThrow(/timeout/)
  })

  it('rejects an invalid language when used directly', async () => {
    const { createE2BBackend: factory } = await import('../src/e2b-backend')
    const backend = factory({ apiKey: 'sk-test' })
    await expect(
      backend.execute('x', { language: 'ruby' as 'javascript' }),
    ).rejects.toThrow(/language/)
    expect(createMock).not.toHaveBeenCalled()
  })
})
