import { delimiter, dirname } from 'node:path'
import { describe, expect, it } from 'vitest'
import { commandExists, findExecutable, resolveCommand } from '../src/process/resolve'

describe('resolveCommand', () => {
  it('passes commands through untouched on POSIX', () => {
    expect(resolveCommand('npx', ['a b'], { env: {} }, false)).toEqual({
      command: 'npx',
      args: ['a b'],
      windowsVerbatimArguments: false,
      found: true,
    })
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
