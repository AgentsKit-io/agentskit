import { delimiter, dirname, isAbsolute } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { batchCommandLine, commandExists, findExecutable, resolveCommand } from '../src/process/resolve'

describe('resolveCommand', () => {
  it('resolves bare POSIX commands against the child PATH', () => {
    const resolved = resolveCommand('node', ['a b'], { env: { PATH: dirname(process.execPath) } }, false)
    expect(resolved).toEqual({ command: expect.stringMatching(/node(\.exe)?$/i), args: ['a b'], windowsVerbatimArguments: false, found: true })
    expect(isAbsolute(resolved.command)).toBe(true)
  })

  it('reports a bare POSIX command missing from the child PATH', () => {
    expect(resolveCommand('node', [], { env: { PATH: '/definitely/not/here' } }, false).found).toBe(false)
  })

  it('passes paths, and commands without a PATH, through untouched on POSIX', () => {
    expect(resolveCommand('./bin/tool', [], { env: { PATH: '/x' } }, false).command).toBe('./bin/tool')
    expect(resolveCommand('npx', [], { env: {} }, false)).toMatchObject({ command: 'npx', found: true })
  })

  it('reports a missing command on Windows before spawning', () => {
    const resolved = resolveCommand('definitely-missing-xyz', [], { env: { PATH: '' } }, true)
    expect(resolved.found).toBe(false)
  })
})

describe('findExecutable', () => {
  it('finds node on PATH', async () => {
    const found = await findExecutable('node', { path: [dirname(process.execPath), process.env.PATH].join(delimiter) })
    expect(found).not.toBeNull()
    expect(await commandExists('node')).toBe(true)
  })

  it('returns null for a missing command', async () => {
    expect(await findExecutable('definitely-missing-xyz')).toBeNull()
    expect(await commandExists('definitely-missing-xyz')).toBe(false)
  })
})

describe('resolveCommand without lookup permission', () => {
  it('lets the runtime resolve when which cannot read PATH', async () => {
    vi.resetModules()
    vi.doMock('which', () => ({
      default: {
        sync: () => {
          throw Object.assign(new Error('Requires read access'), { name: 'NotCapable' })
        },
      },
    }))
    const { resolveCommand: resolveWithoutRead } = await import('../src/process/resolve')
    expect(resolveWithoutRead('node', [], { env: { PATH: '/usr/bin' } }, false)).toMatchObject({ command: 'node', found: true })
    vi.doUnmock('which')
  })
})

describe('batchCommandLine', () => {
  it('escapes cmd.exe metacharacters twice for .cmd/.bat shims that forward %*', () => {
    const [d, s, c, line] = batchCommandLine('C:\\Users\\João\\AppData\\Roaming\\npm\\claude.cmd', ['x&y', 'a"b', 'plain'])
    expect([d, s, c]).toEqual(['/d', '/s', '/c'])
    expect(line).toContain('^^^&')
    expect(line).toContain('^^^"plain^^^"')
    expect(line?.startsWith('"') && line.endsWith('"')).toBe(true)
  })

  it.runIf(process.platform === 'win32')('is applied to batch files found on PATH', async () => {
    const { mkdtemp, writeFile } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = await mkdtemp(join(tmpdir(), 'ak batch '))
    await writeFile(join(dir, 'tool.cmd'), '@echo off\r\n')
    const resolved = resolveCommand('tool', ['x&y'], { env: { PATH: dir, PATHEXT: '.COM;.EXE;.BAT;.CMD' } })
    expect(resolved.found).toBe(true)
    expect(resolved.windowsVerbatimArguments).toBe(true)
    expect(resolved.args.join(' ')).toContain('^^^&')
  })
})
