import { describe, expect, it } from 'vitest'
import {
  noneSandbox,
  processSandbox,
  exposeAllowedEnvKeys,
  renderSandboxExecProfile,
  sandboxExecRuntime,
} from '../src/local-runtimes'
import type { Spawner } from '../src/local-sandbox-types'

function mockSpawner(withExec = true): { spawner: Spawner; calls: Array<[string, unknown]> } {
  const calls: Array<[string, unknown]> = []
  const spawner = {
    spawn: async (o: unknown) => (calls.push(['spawn', o]), { pid: 7, kill: () => calls.push(['kill', null]) }),
    ...(withExec
      ? { exec: async (o: unknown) => (calls.push(['exec', o]), { stdout: 'ok', stderr: '', exitCode: 0, timedOut: false }) }
      : {}),
  } as unknown as Spawner
  return { spawner, calls }
}

describe('noneSandbox', () => {
  it('refuses to spawn external commands', async () => {
    expect(noneSandbox.level).toBe('none')
    await expect(noneSandbox.spawn({ command: 'echo', args: [] })).rejects.toThrow(/in-process compute only/)
  })
})

describe('exposeAllowedEnvKeys', () => {
  it('exposes the allowlist', () => {
    expect(exposeAllowedEnvKeys()).toEqual(expect.arrayContaining(['PATH', 'HOME', 'NODE_ENV']))
  })
})

describe('processSandbox', () => {
  it('spawns with a filtered env (allowlist + AGENTSKITOS_ prefix only)', async () => {
    const { spawner, calls } = mockSpawner()
    const rt = processSandbox({ spawner, defaultEnv: { PATH: '/bin', SECRET: 'x', AGENTSKITOS_FLAG: '1' }, defaultCwd: '/ws' })
    const handle = await rt.spawn({ command: 'node', args: ['-v'] })
    expect(handle.pid).toBe(7)
    const [, opts] = calls.find(([k]) => k === 'spawn')!
    const env = (opts as { env: Record<string, string> }).env
    expect(env).toEqual({ PATH: '/bin', AGENTSKITOS_FLAG: '1' })
    expect(env.SECRET).toBeUndefined()
  })

  it('execs through the spawner', async () => {
    const { spawner } = mockSpawner(true)
    const rt = processSandbox({ spawner })
    const res = await rt.exec!({ command: 'node', args: ['-v'], timeoutMs: 1000, maxOutputBytes: 1024 })
    expect(res.exitCode).toBe(0)
  })

  it('exec throws when the spawner has no exec support', async () => {
    const { spawner } = mockSpawner(false)
    const rt = processSandbox({ spawner })
    await expect(rt.exec!({ command: 'node', args: [] })).rejects.toThrow(/does not support exec/)
  })
})

describe('renderSandboxExecProfile', () => {
  it('denies outbound network by default', () => {
    const p = renderSandboxExecProfile({ workspaceRoot: '/ws' })
    expect(p).toContain('(deny default)')
    expect(p).toContain('(deny network-outbound (with no-log))')
    expect(p).toContain('(allow file-write* (subpath "/ws"))')
  })

  it('allows network + extra readable paths when configured', () => {
    const p = renderSandboxExecProfile({ workspaceRoot: '/ws', allowNetwork: true, extraReadablePaths: ['/data'] })
    expect(p).toContain('(allow network*)')
    expect(p).toContain('(allow file-read* (subpath "/data"))')
  })

  it('escapes paths as SBPL string literals', () => {
    const p = renderSandboxExecProfile({ workspaceRoot: '/tmp/a"b\\c\nnext' })
    expect(p).toContain('(allow file-write* (subpath "/tmp/a\\"b\\\\c\\nnext"))')
  })
})

describe('sandboxExecRuntime', () => {
  it('spawns sandbox-exec with the rendered profile via the injected spawner', async () => {
    const { spawner, calls } = mockSpawner()
    const rt = sandboxExecRuntime({ policy: { workspaceRoot: '/ws' }, spawner })
    expect(rt.name).toBe('sandbox-exec')
    await rt.spawn({ command: 'echo', args: ['hi'], cwd: '/ws' })
    const [, opts] = calls.find(([k]) => k === 'spawn')!
    const args = (opts as { args: string[] }).args
    expect(args[0]).toBe('-p')
    expect(args).toContain('echo')
  })
})
