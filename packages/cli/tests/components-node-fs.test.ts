import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nodeConfigIo, nodeFetch, nodeScanFs, nodeWriteFs } from '../src/components/node-fs'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ak-nodefs-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('nodeScanFs', () => {
  it('reads an existing file', () => {
    const fs = nodeScanFs()
    // write a file via nodeWriteFs so we can read it back
    nodeWriteFs().write(join(root, 'pkg.json'), '{"name":"test"}')
    expect(fs.readFile(join(root, 'pkg.json'))).toBe('{"name":"test"}')
  })

  it('returns null for a missing file', () => {
    const fs = nodeScanFs()
    expect(fs.readFile(join(root, 'does-not-exist.json'))).toBeNull()
  })

  it('exists returns true for a present file and false for a missing one', () => {
    const fs = nodeScanFs()
    nodeWriteFs().write(join(root, 'present.txt'), 'hi')
    expect(fs.exists(join(root, 'present.txt'))).toBe(true)
    expect(fs.exists(join(root, 'absent.txt'))).toBe(false)
  })
})

describe('nodeWriteFs', () => {
  it('creates nested directories and writes a file', () => {
    const fs = nodeWriteFs()
    const path = join(root, 'a', 'b', 'c', 'file.txt')
    fs.write(path, 'hello nested')
    expect(nodeScanFs().readFile(path)).toBe('hello nested')
  })

  it('overwrites an existing file', () => {
    const fs = nodeWriteFs()
    const path = join(root, 'file.txt')
    fs.write(path, 'first')
    fs.write(path, 'second')
    expect(nodeScanFs().readFile(path)).toBe('second')
  })

  it('removes a file that exists', () => {
    const fs = nodeWriteFs()
    const path = join(root, 'gone.txt')
    fs.write(path, 'bye')
    expect(fs.exists(path)).toBe(true)
    fs.remove(path)
    expect(fs.exists(path)).toBe(false)
  })

  it('remove is silent when the file is already absent (force behaviour)', () => {
    const fs = nodeWriteFs()
    expect(() => fs.remove(join(root, 'never-existed.txt'))).not.toThrow()
  })

  it('exists returns correct values', () => {
    const fs = nodeWriteFs()
    const path = join(root, 'check.txt')
    expect(fs.exists(path)).toBe(false)
    fs.write(path, 'x')
    expect(fs.exists(path)).toBe(true)
  })
})

describe('nodeConfigIo', () => {
  it('round-trips read/write with a nested path', () => {
    const io = nodeConfigIo()
    const path = join(root, '.agentskit', 'components.json')
    const content = '{"schemaVersion":1}'
    io.write(path, content)
    expect(io.read(path)).toBe(content)
  })

  it('read returns null for a missing file', () => {
    const io = nodeConfigIo()
    expect(io.read(join(root, 'no-such-file.json'))).toBeNull()
  })
})

describe('nodeFetch', () => {
  it('is a function (network calls are not exercised in unit tests)', () => {
    expect(typeof nodeFetch).toBe('function')
  })
})
