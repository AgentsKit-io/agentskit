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

  it('allows network when requested', () => {
    expect(renderSandboxExecProfile({ workspaceRoot: '/ws', allowNetwork: true })).toContain('(allow network*)')
  })
})
