import { mkdtemp, mkdir, readFile, readdir, readlink, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copyPath, createSymlink, removePath, renamePath, setFileMode, writeFileAtomic } from '../src/fs'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ak-xplat-'))
})

afterEach(async () => {
  await removePath(dir)
})

describe('fs', () => {
  it('removes trees and ignores missing paths', async () => {
    await mkdir(join(dir, 'a', 'b'), { recursive: true })
    await writeFile(join(dir, 'a', 'b', 'f.txt'), 'x')
    await removePath(join(dir, 'a'), { maxRetries: 1, retryDelay: 1 })
    await removePath(join(dir, 'missing'))
    expect(await readdir(dir)).toEqual([])
  })

  it('renames, replacing the target', async () => {
    await writeFile(join(dir, 'from'), 'new')
    await writeFile(join(dir, 'to'), 'old')
    await renamePath(join(dir, 'from'), join(dir, 'to'))
    expect(await readFile(join(dir, 'to'), 'utf8')).toBe('new')
    await expect(renamePath(join(dir, 'nope'), join(dir, 'x'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('writes atomically and leaves no temp files', async () => {
    const target = join(dir, 'state.json')
    await writeFileAtomic(target, '{"a":1}')
    await writeFileAtomic(target, new TextEncoder().encode('{"a":2}'))
    expect(await readFile(target, 'utf8')).toBe('{"a":2}')
    expect(await readdir(dir)).toEqual(['state.json'])
  })

  it('cleans the temp file when the write fails', async () => {
    await expect(writeFileAtomic(join(dir, 'missing-dir', 'x'), 'x')).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readdir(dir)).toEqual([])
  })

  it('links files and directories', async () => {
    await writeFile(join(dir, 'file'), 'x')
    await mkdir(join(dir, 'folder'))
    const fileKind = await createSymlink(join(dir, 'file'), join(dir, 'file-link'))
    const dirKind = await createSymlink(join(dir, 'folder'), join(dir, 'folder-link'))
    expect(['symlink', 'copy']).toContain(fileKind)
    expect(['symlink', 'junction']).toContain(dirKind)
    expect(await readFile(join(dir, 'file-link'), 'utf8')).toBe('x')
    if (fileKind === 'symlink') expect(await readlink(join(dir, 'file-link'))).toBe(join(dir, 'file'))
    await expect(createSymlink(join(dir, 'file'), join(dir, 'file-link'))).rejects.toMatchObject({ code: 'EEXIST' })
  })

  it('copies trees', async () => {
    await mkdir(join(dir, 'src', 'deep'), { recursive: true })
    await writeFile(join(dir, 'src', 'deep', 'f'), 'x')
    await copyPath(join(dir, 'src'), join(dir, 'dst'))
    expect(await readFile(join(dir, 'dst', 'deep', 'f'), 'utf8')).toBe('x')
    await expect(copyPath(join(dir, 'nope'), join(dir, 'x'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('applies mode bits only where they exist', async () => {
    const file = join(dir, 'script.sh')
    await writeFile(file, '#!/bin/sh\n')
    const applied = await setFileMode(file, 0o755)
    expect(applied).toBe(process.platform !== 'win32')
    if (applied) {
      expect((await stat(file)).mode & 0o777).toBe(0o755)
      await expect(setFileMode(join(dir, 'nope'), 0o600)).rejects.toMatchObject({ code: 'ENOENT' })
    }
  })
})
