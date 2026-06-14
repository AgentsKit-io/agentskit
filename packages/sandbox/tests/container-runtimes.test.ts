import { describe, expect, it } from 'vitest'
import { renderBwrapArgs, renderDockerArgs } from '../src/index'

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
