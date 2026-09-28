import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ ps: '/usr/bin/ps' as string | null, mode: 'error' as 'error' | 'throw' }))

vi.mock('../src/runtime', () => ({ isLinux: true, isWindows: false }))
vi.mock('which', () => ({ default: { sync: () => state.ps } }))
vi.mock('tree-kill', () => ({
  default: (_pid: number, _signal: string, callback: (error?: Error) => void) => {
    if (state.mode === 'throw') throw new Error('spawn failed')
    callback(new Error('taskkill: not found'))
  },
}))

// Never signal a real process group from these tests.
let groupKill: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  groupKill = vi.spyOn(process, 'kill').mockImplementation(() => true)
})

afterEach(() => {
  groupKill.mockRestore()
  vi.resetModules()
})

describe('killProcessTree fallbacks', () => {
  it('signals only the pid when tree-kill reports an error', async () => {
    const { killProcessTree } = await import('../src/process/kill')
    const fallback = vi.fn()
    await killProcessTree(123, 'SIGTERM', fallback)
    expect(fallback).toHaveBeenCalledWith('SIGTERM')
    expect(groupKill).toHaveBeenCalledWith(-123, 'SIGTERM')
  })

  it('signals only the pid when tree-kill throws', async () => {
    state.mode = 'throw'
    const { killProcessTree } = await import('../src/process/kill')
    const fallback = vi.fn()
    await killProcessTree(123, 'SIGKILL', fallback)
    expect(fallback).toHaveBeenCalledWith('SIGKILL')
  })

  it('skips tree walking when ps is not installed', async () => {
    state.ps = null
    const { killProcessTree } = await import('../src/process/kill')
    const fallback = vi.fn(() => {
      throw new Error('ESRCH')
    })
    await expect(killProcessTree(123, 'SIGTERM', fallback)).resolves.toBeUndefined()
    expect(fallback).toHaveBeenCalledOnce()
    expect(groupKill).toHaveBeenCalledWith(-123, 'SIGTERM')
  })

  it('ignores a pid that leads no process group', async () => {
    groupKill.mockImplementation(() => {
      throw Object.assign(new Error('kill ESRCH'), { code: 'ESRCH' })
    })
    const { killProcessTree } = await import('../src/process/kill')
    await expect(killProcessTree(123, 'SIGKILL', vi.fn())).resolves.toBeUndefined()
  })
})
