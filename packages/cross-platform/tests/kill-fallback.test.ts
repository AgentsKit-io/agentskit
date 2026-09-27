import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ ps: '/usr/bin/ps' as string | null, mode: 'error' as 'error' | 'throw' }))

vi.mock('../src/runtime', () => ({ isLinux: true }))
vi.mock('which', () => ({ default: { sync: () => state.ps } }))
vi.mock('tree-kill', () => ({
  default: (_pid: number, _signal: string, callback: (error?: Error) => void) => {
    if (state.mode === 'throw') throw new Error('spawn failed')
    callback(new Error('taskkill: not found'))
  },
}))

afterEach(() => {
  vi.resetModules()
})

describe('killProcessTree fallbacks', () => {
  it('signals only the pid when tree-kill reports an error', async () => {
    const { killProcessTree } = await import('../src/process/kill')
    const fallback = vi.fn()
    await killProcessTree(123, 'SIGTERM', fallback)
    expect(fallback).toHaveBeenCalledWith('SIGTERM')
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
  })
})
