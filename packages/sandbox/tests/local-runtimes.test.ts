import { describe, expect, it, vi } from 'vitest'
import { AgentsKitError } from '@agentskit/core'
import {
  noneSandbox,
  processSandbox,
  renderSandboxExecProfile,
  type Spawner,
} from '../src/index'

const fakeSpawner = (): Spawner => ({
  spawn: vi.fn(async (opts) => ({ pid: 4242, kill: async () => {}, _opts: opts }) as never),
  exec: vi.fn(async () => ({ exitCode: 0, stdout: 'ok', stderr: '', truncated: false, timedOut: false })),
})

describe('noneSandbox', () => {
  it('rejects spawn (in-process only)', async () => {
    await expect(noneSandbox.spawn({ command: 'ls', args: [] })).rejects.toBeInstanceOf(AgentsKitError)
  })
})

describe('processSandbox', () => {
  it('spawns through the injected spawner', async () => {
    const spawner = fakeSpawner()
    const rt = processSandbox({ spawner })
    const handle = await rt.spawn({ command: 'echo', args: ['hi'] })
    expect(handle.pid).toBe(4242)
    expect(spawner.spawn).toHaveBeenCalledOnce()
  })

  it('filters env to the allowlist', async () => {
    const spawner = fakeSpawner()
    const rt = processSandbox({ spawner, defaultEnv: { PATH: '/usr/bin', SECRET: 'nope' } })
    await rt.spawn({ command: 'echo', args: [] })
    const passedEnv = (spawner.spawn as ReturnType<typeof vi.fn>).mock.calls[0][0].env
    expect(passedEnv).toEqual({ PATH: '/usr/bin' })
  })

  it('snapshots defaultEnv so later mutations do not widen policy', async () => {
    const spawner = fakeSpawner()
    const env: Record<string, string> = { PATH: '/usr/bin' }
    const rt = processSandbox({ spawner, defaultEnv: env })
    env.SECRET = 'leaked'
    env.PATH = '/evil'
    await rt.spawn({ command: 'echo', args: [] })
    const passedEnv = (spawner.spawn as ReturnType<typeof vi.fn>).mock.calls[0][0].env
    expect(passedEnv).toEqual({ PATH: '/usr/bin' })
    expect(passedEnv.SECRET).toBeUndefined()
  })

  it('execs through the injected spawner', async () => {
    const rt = processSandbox({ spawner: fakeSpawner() })
    const res = await rt.exec!({ command: 'echo', args: ['hi'] })
    expect(res.exitCode).toBe(0)
  })
})

describe('renderSandboxExecProfile', () => {
  it('denies network by default and scopes writes to the workspace', () => {
    const profile = renderSandboxExecProfile({ workspaceRoot: '/ws' })
    expect(profile).toContain('(deny default)')
    expect(profile).toContain('(allow file-write* (subpath "/ws"))')
    expect(profile).toContain('(deny network-outbound (with no-log))')
  })

  it('does not grant global file-read*', () => {
    const profile = renderSandboxExecProfile({ workspaceRoot: '/ws' })
    expect(profile).not.toMatch(/^\(allow file-read\*\)$/m)
    expect(profile).not.toContain('(allow file-read*)\n')
    // scoped reads only
    expect(profile).toContain('(allow file-read* (subpath "/ws"))')
    expect(profile).toContain('(allow file-read* (subpath "/usr"))')
  })

  it('allows network when requested', () => {
    expect(renderSandboxExecProfile({ workspaceRoot: '/ws', allowNetwork: true })).toContain('(allow network*)')
  })

  it('rejects non-absolute workspaceRoot', () => {
    expect(() => renderSandboxExecProfile({ workspaceRoot: 'relative/ws' })).toThrow(/absolute/)
  })

  it('is deterministic for the same policy', () => {
    const a = renderSandboxExecProfile({ workspaceRoot: '/ws', extraReadablePaths: ['/a', '/b'] })
    const b = renderSandboxExecProfile({ workspaceRoot: '/ws', extraReadablePaths: ['/a', '/b'] })
    expect(a).toBe(b)
  })
})
