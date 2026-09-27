import { afterEach, describe, expect, it, vi } from 'vitest'

const flags = vi.hoisted(() => ({ runtime: 'workerd', win: false, mac: false, linux: false }))

vi.mock('std-env', () => ({
  get runtime() {
    return flags.runtime
  },
  get isWindows() {
    return flags.win
  },
  get isMacOS() {
    return flags.mac
  },
  get isLinux() {
    return flags.linux
  },
  isBun: false,
  isDeno: false,
  platform: '',
}))

afterEach(() => {
  vi.resetModules()
  delete (globalThis as { window?: unknown }).window
})

describe('runtime detection outside server runtimes', () => {
  it('reports edge workers', async () => {
    const { getRuntimeInfo } = await import('../src/runtime')
    expect(getRuntimeInfo()).toEqual({ runtime: 'edge', os: 'unknown', platform: '', isServer: false })
  })

  it('reports browsers and unknown hosts', async () => {
    flags.runtime = ''
    ;(globalThis as { window?: unknown }).window = {}
    const { getRuntimeInfo } = await import('../src/runtime')
    expect(getRuntimeInfo().runtime).toBe('browser')
    delete (globalThis as { window?: unknown }).window
    expect(getRuntimeInfo().runtime).toBe('unknown')
  })

  it('maps each OS family', async () => {
    const { getRuntimeInfo } = await import('../src/runtime')
    flags.win = true
    expect(getRuntimeInfo().os).toBe('windows')
    flags.win = false
    flags.mac = true
    expect(getRuntimeInfo().os).toBe('macos')
    flags.mac = false
    flags.linux = true
    expect(getRuntimeInfo().os).toBe('linux')
  })
})
