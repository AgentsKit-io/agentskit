import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ConfigError } from '@agentskit/core'
import { validateScaffoldConfig } from '../src/scaffold-config'
import {
  isPathInside,
  lstatOrNull,
  assertNotSymlink,
  resolveScaffoldRoots,
  writePackageAtomically,
} from '../src/scaffold-fs'
import {
  mkdtemp,
  mkdir,
  writeFile,
  symlink,
  rm,
  readFile,
  rename,
} from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import * as fsPromises from 'node:fs/promises'

describe('validateScaffoldConfig edge cases', () => {
  it('rejects non-object config', () => {
    expect(() => validateScaffoldConfig(null as never)).toThrow(/must be an object/)
    expect(() => validateScaffoldConfig(undefined as never)).toThrow(/must be an object/)
  })

  it('rejects NUL in dir and description, non-string description, bad overwrite', () => {
    expect(() =>
      validateScaffoldConfig({ type: 'tool', name: 'ok', dir: 'bad\0dir' }),
    ).toThrow(/NUL/)
    expect(() =>
      validateScaffoldConfig({
        type: 'tool',
        name: 'ok',
        dir: '/tmp',
        description: 42 as never,
      }),
    ).toThrow(/description must be a string/)
    expect(() =>
      validateScaffoldConfig({
        type: 'tool',
        name: 'ok',
        dir: '/tmp',
        description: 'has\0nul',
      }),
    ).toThrow(/NUL/)
    expect(() =>
      validateScaffoldConfig({
        type: 'tool',
        name: 'ok',
        dir: '/tmp',
        overwrite: 'yes' as never,
      }),
    ).toThrow(/overwrite must be a boolean/)
  })

  it('accepts overwrite false explicitly', () => {
    expect(() =>
      validateScaffoldConfig({
        type: 'skill',
        name: 'ok-name',
        dir: '/tmp/out',
        overwrite: false,
      }),
    ).not.toThrow()
  })
})

describe('scaffold-fs helpers', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ak-scaffold-fs-'))
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  })

  it('isPathInside rejects escapes and absolute relatives', () => {
    expect(isPathInside('/tmp/a', '/tmp/a/b')).toBe(true)
    expect(isPathInside('/tmp/a', '/tmp/a')).toBe(true)
    expect(isPathInside('/tmp/a', '/tmp/b')).toBe(false)
    expect(isPathInside('/tmp/a', '/etc/passwd')).toBe(false)
  })

  it('lstatOrNull returns null for missing paths', async () => {
    expect(await lstatOrNull(join(dir, 'missing'))).toBeNull()
  })

  it('assertNotSymlink rejects symlink paths', async () => {
    const real = join(dir, 'real')
    await mkdir(real)
    const link = join(dir, 'link')
    await symlink(real, link)
    await expect(assertNotSymlink(link, 'use')).rejects.toThrow(/symlink/)
  })

  it('resolveScaffoldRoots rejects empty name edge that collapses to parent', () => {
    // Validated names cannot be empty; force the containment check with resolve tricks.
    // A name of '.' would resolve to parent — not a valid SAFE_PACKAGE_NAME, but the
    // FS helper still guards containment independently.
    expect(() => resolveScaffoldRoots(dir, '.')).toThrow(ConfigError)
  })

  it('writePackageAtomically writes and returns final paths', async () => {
    const finalRoot = join(dir, 'pkg')
    const paths = await writePackageAtomically({
      parentDir: dir,
      finalRoot,
      overwrite: false,
      files: [
        { relativePath: 'src/index.ts', content: 'export const x = 1\n' },
        { relativePath: 'README.md', content: 'hi\n' },
      ],
    })
    expect(paths).toEqual([join(finalRoot, 'src/index.ts'), join(finalRoot, 'README.md')])
    expect(await readFile(join(finalRoot, 'src/index.ts'), 'utf8')).toBe('export const x = 1\n')
  })

  it('writePackageAtomically rejects path escape in relativePath', async () => {
    await expect(
      writePackageAtomically({
        parentDir: dir,
        finalRoot: join(dir, 'escape-pkg'),
        overwrite: false,
        files: [{ relativePath: '../outside.ts', content: 'x' }],
      }),
    ).rejects.toThrow(/escapes package root/)
  })

  it('writePackageAtomically rejects a final root outside its parent', async () => {
    await expect(
      writePackageAtomically({
        parentDir: join(dir, 'parent'),
        finalRoot: join(dir, 'outside'),
        overwrite: false,
        files: [{ relativePath: 'a.txt', content: 'x' }],
      }),
    ).rejects.toThrow(/escapes parent/)
  })

  it('writePackageAtomically overwrites with backup and leaves no staging', async () => {
    const finalRoot = join(dir, 'ow')
    await writePackageAtomically({
      parentDir: dir,
      finalRoot,
      overwrite: false,
      files: [{ relativePath: 'a.txt', content: 'old' }],
    })
    await writePackageAtomically({
      parentDir: dir,
      finalRoot,
      overwrite: true,
      files: [{ relativePath: 'a.txt', content: 'new' }],
    })
    expect(await readFile(join(finalRoot, 'a.txt'), 'utf8')).toBe('new')
    const entries = await fsPromises.readdir(dir)
    expect(entries.filter(e => e.startsWith('.agentskit-scaffold-'))).toEqual([])
  })

  it('writePackageAtomically rolls back when promote rename fails after backup', async () => {
    const finalRoot = join(dir, 'rollback')
    await writePackageAtomically({
      parentDir: dir,
      finalRoot,
      overwrite: false,
      files: [{ relativePath: 'keep.txt', content: 'original' }],
    })

    let renameCount = 0
    await expect(
      writePackageAtomically({
        parentDir: dir,
        finalRoot,
        overwrite: true,
        files: [{ relativePath: 'keep.txt', content: 'should-not-stick' }],
        io: {
          rename: async (from, to) => {
            renameCount++
            // 1st: final -> backup; 2nd: staging -> final (fail); 3rd: rollback
            if (renameCount === 2) throw new Error('simulated promote failure')
            return rename(from, to)
          },
        },
      }),
    ).rejects.toThrow(/simulated promote failure/)

    expect(await readFile(join(finalRoot, 'keep.txt'), 'utf8')).toBe('original')
  })

  it('reports the retained backup when promotion and rollback both fail', async () => {
    const finalRoot = join(dir, 'rollback-fails')
    await writePackageAtomically({
      parentDir: dir,
      finalRoot,
      overwrite: false,
      files: [{ relativePath: 'keep.txt', content: 'original' }],
    })

    let renameCount = 0
    const error = await writePackageAtomically({
      parentDir: dir,
      finalRoot,
      overwrite: true,
      files: [{ relativePath: 'keep.txt', content: 'replacement' }],
      io: {
        rename: async (from, to) => {
          renameCount++
          if (renameCount >= 2) throw new Error(`rename ${renameCount} failed`)
          return rename(from, to)
        },
      },
    }).then(
      () => null,
      (reason: unknown) => reason,
    )

    expect(error).toBeInstanceOf(ConfigError)
    expect((error as ConfigError).hint).toMatch(/remains at .*backup/)
  })

  it('writePackageAtomically cleans staging when initial write fails', async () => {
    const finalRoot = join(dir, 'fail-write')

    await expect(
      writePackageAtomically({
        parentDir: dir,
        finalRoot,
        overwrite: false,
        files: [
          { relativePath: 'ok.ts', content: 'ok' },
          { relativePath: 'boom.ts', content: 'nope' },
        ],
        io: {
          writeFile: async (path, data, enc) => {
            if (String(path).endsWith('boom.ts')) throw new Error('disk full')
            return writeFile(path, data as string, enc as BufferEncoding)
          },
        },
      }),
    ).rejects.toThrow(/disk full/)

    const entries = await fsPromises.readdir(dir)
    expect(entries.filter(e => e.startsWith('.agentskit-scaffold-'))).toEqual([])
    // Final destination must not exist as a partial tree.
    expect(await lstatOrNull(finalRoot)).toBeNull()
  })

  it('writePackageAtomically rejects existing destination without overwrite', async () => {
    const finalRoot = join(dir, 'exists')
    await mkdir(finalRoot)
    await writeFile(join(finalRoot, 'x'), 'y', 'utf8')
    await expect(
      writePackageAtomically({
        parentDir: dir,
        finalRoot,
        overwrite: false,
        files: [{ relativePath: 'a.txt', content: 'z' }],
      }),
    ).rejects.toThrow(/already exists/)
  })

  it('writePackageAtomically rejects symlink destination even with overwrite', async () => {
    const real = join(dir, 'real-dest')
    await mkdir(real)
    const link = join(dir, 'link-dest')
    await symlink(real, link)
    await expect(
      writePackageAtomically({
        parentDir: dir,
        finalRoot: link,
        overwrite: true,
        files: [{ relativePath: 'a.txt', content: 'z' }],
      }),
    ).rejects.toThrow(/symlink/)
  })
})
