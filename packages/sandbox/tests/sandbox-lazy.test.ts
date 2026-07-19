import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SandboxBackend } from '../src/types'

afterEach(() => {
  vi.doUnmock('../src/e2b-backend')
  vi.resetModules()
})

describe('createSandbox lazy E2B lifecycle', () => {
  it('coalesces concurrent initialization into one backend', async () => {
    const backend: SandboxBackend = {
      execute: vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 0 })),
      dispose: vi.fn(async () => undefined),
    }
    const createE2BBackend = vi.fn(() => backend)
    vi.doMock('../src/e2b-backend', () => ({ createE2BBackend }))
    const { createSandbox } = await import('../src/sandbox')
    const sandbox = createSandbox({ apiKey: 'sk-test' })

    await Promise.all([sandbox.execute('a'), sandbox.execute('b')])

    expect(createE2BBackend).toHaveBeenCalledTimes(1)
    expect(backend.execute).toHaveBeenCalledTimes(2)
    await sandbox.dispose()
    expect(backend.dispose).toHaveBeenCalledTimes(1)
  })

  it('disposes a backend created while dispose races initialization', async () => {
    const backend: SandboxBackend = {
      execute: vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 0 })),
      dispose: vi.fn(async () => undefined),
    }
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    vi.doMock('../src/e2b-backend', async () => {
      await gate
      return { createE2BBackend: vi.fn(() => backend) }
    })
    const { createSandbox } = await import('../src/sandbox')
    const sandbox = createSandbox({ apiKey: 'sk-test' })
    const execution = sandbox.execute('a')
    const disposal = sandbox.dispose()
    release()

    await disposal
    await expect(execution).rejects.toThrow(/disposed/)
    expect(backend.execute).not.toHaveBeenCalled()
    expect(backend.dispose).toHaveBeenCalledTimes(1)
  })
})
