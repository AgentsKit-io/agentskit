import { describe, expect, it } from 'vitest'
import { renderBwrapArgs, renderDockerArgs } from '../src/index'
import {
  assertSafeDockerCapability,
  assertSafeDockerExtraArgs,
  bwrapRuntime,
  dockerRuntime,
  getBwrapPath,
  isBwrapSupported,
} from '../src/container-runtimes'
import type { Spawner } from '../src/local-sandbox-types'

function mockSpawner(withExec = true): { spawner: Spawner; calls: Array<[string, unknown]> } {
  const calls: Array<[string, unknown]> = []
  const spawner = {
    spawn: async (o: unknown) => {
      calls.push(['spawn', o])
      return { pid: 4242, kill: () => calls.push(['kill', null]) }
    },
    ...(withExec
      ? { exec: async (o: unknown) => (calls.push(['exec', o]), { stdout: '', stderr: '', exitCode: 0, timedOut: false }) }
      : {}),
  } as unknown as Spawner
  return { spawner, calls }
}

describe('renderBwrapArgs', () => {
  it('unshares everything and binds the workspace', () => {
    const args = renderBwrapArgs({ workspaceRoot: '/ws' })
    expect(args).toContain('--unshare-all')
    expect(args).toContain('--die-with-parent')
    const i = args.indexOf('--bind')
    expect([args[i + 1], args[i + 2]]).toEqual(['/ws', '/ws'])
    expect(args).not.toContain('--share-net')
  })

  it('shares net only when allowed', () => {
    expect(renderBwrapArgs({ workspaceRoot: '/ws', allowNetwork: true })).toContain('--share-net')
  })

  it('binds extra read-only and read-write paths', () => {
    const args = renderBwrapArgs({
      workspaceRoot: '/ws',
      readOnlyPaths: ['/ro'],
      readWritePaths: ['/rw'],
    })
    const ro = args.indexOf('--ro-bind')
    expect([args[ro + 1], args[ro + 2]]).toEqual(['/ro', '/ro'])
    const binds: string[] = []
    args.forEach((a, i) => {
      if (a === '--bind') binds.push(args[i + 1]!)
    })
    expect(binds).toEqual(['/ws', '/rw'])
  })

  it('rejects relative workspaceRoot', () => {
    expect(() => renderBwrapArgs({ workspaceRoot: 'ws' })).toThrow(/absolute/)
  })
})

describe('isBwrapSupported / getBwrapPath', () => {
  it('reports support based on platform and resolves a path or null', () => {
    expect(isBwrapSupported()).toBe(process.platform === 'linux')
    const path = getBwrapPath()
    expect(path === null || typeof path === 'string').toBe(true)
    if (process.platform !== 'linux') expect(path).toBeNull()
  })
})

describe('renderDockerArgs (full policy)', () => {
  it('honors capabilities, user, mountTarget, and safe extraArgs', () => {
    const args = renderDockerArgs({
      image: 'node:20',
      workspaceRoot: '/ws',
      mountTarget: '/app',
      capabilities: ['NET_BIND_SERVICE'],
      user: '1000:1000',
      extraArgs: ['--memory', '256m'],
    })
    expect(args).toContain('--cap-add')
    expect(args).toContain('NET_BIND_SERVICE')
    const u = args.indexOf('--user')
    expect(args[u + 1]).toBe('1000:1000')
    expect(args).toContain('/ws:/app:ro')
    expect(args).toContain('--memory')
    expect(args).toContain('256m')
  })
})

describe('docker extraArgs / capabilities safety', () => {
  it('rejects obvious escapes', () => {
    expect(() => assertSafeDockerExtraArgs(['--privileged'])).toThrow(/privileged/)
    expect(() => assertSafeDockerExtraArgs(['--pid=host'])).toThrow(/PID/)
    expect(() => assertSafeDockerExtraArgs(['--ipc', 'host'])).toThrow(/IPC/)
    expect(() => assertSafeDockerExtraArgs(['--network=host'])).toThrow(/network/)
    expect(() => assertSafeDockerExtraArgs(['--network', 'bridge'])).toThrow(/policy\.network/)
    expect(() => assertSafeDockerExtraArgs(['--cap-add', 'NET_BIND_SERVICE'])).toThrow(/policy\.capabilities/)
    expect(() => assertSafeDockerExtraArgs(['-v', '/:/host'])).toThrow(/volume/)
    expect(() => assertSafeDockerExtraArgs(['--device=/dev/sda'])).toThrow(/device/)
    expect(() => assertSafeDockerExtraArgs(['--security-opt', 'seccomp=unconfined'])).toThrow(/security-opt/)
    expect(() => assertSafeDockerCapability('ALL')).toThrow(/capability/)
    expect(() => assertSafeDockerCapability('SYS_ADMIN')).toThrow(/capability/)
  })

  it('allows safe resource limits', () => {
    expect(() => assertSafeDockerExtraArgs(['--memory', '256m', '--cpus', '1'])).not.toThrow()
  })

  it('renderDockerArgs rejects host network and dangerous caps', () => {
    expect(() =>
      renderDockerArgs({ image: 'node:20', workspaceRoot: '/ws', network: 'host' }),
    ).toThrow(/host/)
    expect(() =>
      renderDockerArgs({ image: 'node:20', workspaceRoot: '/ws', capabilities: ['SYS_ADMIN'] }),
    ).toThrow(/capability/)
    expect(() =>
      renderDockerArgs({ image: 'node:20', workspaceRoot: '/ws', extraArgs: ['--privileged'] }),
    ).toThrow(/privileged/)
  })

  it('snapshots extraArgs on dockerRuntime so later mutation is ignored', async () => {
    const extra = ['--memory', '64m']
    const { spawner, calls } = mockSpawner()
    const rt = dockerRuntime({
      policy: { image: 'node:20', workspaceRoot: '/ws', extraArgs: extra },
      spawner,
    })
    extra.push('--privileged')
    await rt.spawn({ command: 'true', args: [] })
    const [, opts] = calls.find(([k]) => k === 'spawn')!
    const args = (opts as { args: string[] }).args
    expect(args).toContain('--memory')
    expect(args).toContain('64m')
    expect(args).not.toContain('--privileged')
  })
})

describe('bwrapRuntime', () => {
  it('spawns through the injected spawner', async () => {
    const { spawner, calls } = mockSpawner()
    const rt = bwrapRuntime({ policy: { workspaceRoot: '/ws' }, spawner })
    expect(rt.name).toBe('bwrap')
    // level stays 'process' for registry compatibility (beta/future remap)
    expect(rt.level).toBe('process')
    const handle = await rt.spawn({ command: 'echo', args: ['hi'] })
    expect(handle.pid).toBe(4242)
    const [, opts] = calls.find(([k]) => k === 'spawn')!
    expect((opts as { command: string }).command).toBe('bwrap')
    handle.kill()
    expect(calls.some(([k]) => k === 'kill')).toBe(true)
  })
})

describe('dockerRuntime', () => {
  it('spawns and execs through the injected spawner', async () => {
    const { spawner, calls } = mockSpawner(true)
    const rt = dockerRuntime({ policy: { image: 'node:20', workspaceRoot: '/ws' }, spawner })
    expect(rt.name).toBe('docker')
    await rt.spawn({ command: 'node', args: ['-e', '1'] })
    const res = await rt.exec!({ command: 'node', args: ['-e', '1'] })
    expect(res.exitCode).toBe(0)
    expect(calls.map(([k]) => k)).toEqual(expect.arrayContaining(['spawn', 'exec']))
  })

  it('exec throws when the spawner has no exec support', async () => {
    const { spawner } = mockSpawner(false)
    const rt = dockerRuntime({ policy: { image: 'node:20', workspaceRoot: '/ws' }, spawner })
    await expect(rt.exec!({ command: 'node', args: [] })).rejects.toThrow(/does not support exec/)
  })
})

describe('renderDockerArgs', () => {
  it('drops caps, disables network, mounts workspace read-only by default', () => {
    const args = renderDockerArgs({ image: 'node:20', workspaceRoot: '/ws' })
    expect(args.slice(0, 3)).toEqual(['run', '--rm', '--init'])
    expect(args).toContain('--cap-drop')
    expect(args).toContain('ALL')
    const n = args.indexOf('--network')
    expect(args[n + 1]).toBe('none')
    expect(args).toContain('/ws:/workspace:ro')
    expect(args[args.length - 1]).toBe('node:20')
  })

  it('mounts read-write and sets a named network when configured', () => {
    const args = renderDockerArgs({
      image: 'node:20',
      workspaceRoot: '/ws',
      writableWorkspace: true,
      network: 'egress-net',
    })
    expect(args).toContain('/ws:/workspace:rw')
    const n = args.indexOf('--network')
    expect(args[n + 1]).toBe('egress-net')
  })
})
