import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.doUnmock('@agentskit/cross-platform')
  vi.resetModules()
})

describe('SandboxRegistry spawner import', () => {
  it('does not start importing cross-platform before the spawner is used', async () => {
    const onImport = vi.fn()
    vi.doMock('@agentskit/cross-platform', () => {
      onImport()
      return { isWindows: false, killProcessTree: vi.fn(), spawnNodeChild: vi.fn() }
    })

    const { SandboxRegistry } = await import('../src/local-registry')
    new SandboxRegistry()
    await new Promise<void>((resolve) => setImmediate(resolve))

    expect(onImport).not.toHaveBeenCalled()
  })
})
