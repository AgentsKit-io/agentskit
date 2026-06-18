import { describe, expect, it } from 'vitest'
import {
  IntegrityError,
  assertContained,
  commitFiles,
  isSafeRegistryPath,
  type WriteFs,
} from '../src/components/install'

const TARGET = '/proj/components/ask'

/** In-memory WriteFs backed by a Map. `failOn` makes a given dest throw on write. */
function fakeFs(seed: Record<string, string> = {}, failOn?: string): WriteFs & { files: Map<string, string> } {
  const files = new Map(Object.entries(seed))
  return {
    files,
    exists: (p) => files.has(p),
    write: (p, c) => {
      if (p === failOn) throw new Error('disk full')
      files.set(p, c)
    },
    remove: (p) => void files.delete(p),
  }
}

describe('isSafeRegistryPath', () => {
  it('accepts relative paths and rejects absolute / traversal / empty segments', () => {
    expect(isSafeRegistryPath('a/b.ts')).toBe(true)
    expect(isSafeRegistryPath('lib/ask/guard.ts')).toBe(true)
    expect(isSafeRegistryPath('')).toBe(false)
    expect(isSafeRegistryPath('/etc/passwd')).toBe(false)
    expect(isSafeRegistryPath('../x')).toBe(false)
    expect(isSafeRegistryPath('a/../b')).toBe(false)
    expect(isSafeRegistryPath('a/./b')).toBe(false)
    expect(isSafeRegistryPath('a//b')).toBe(false)
  })
})

describe('assertContained (D16)', () => {
  it('resolves a safe path inside the target', () => {
    expect(assertContained(TARGET, 'a/b.ts')).toBe('/proj/components/ask/a/b.ts')
  })

  it('throws IntegrityError on traversal or absolute paths', () => {
    expect(() => assertContained(TARGET, '../../.env')).toThrow(IntegrityError)
    expect(() => assertContained(TARGET, '/etc/passwd')).toThrow(IntegrityError)
    expect(() => assertContained(TARGET, 'ok/../../../etc')).toThrow(IntegrityError)
  })
})

describe('commitFiles (D10 transactional)', () => {
  it('writes every file under the target', () => {
    const fs = fakeFs()
    const res = commitFiles(fs, TARGET, [
      { path: 'widget.tsx', content: 'a' },
      { path: 'lib/guard.ts', content: 'b' },
    ])
    expect(res.written).toEqual(['/proj/components/ask/widget.tsx', '/proj/components/ask/lib/guard.ts'])
    expect(fs.files.get('/proj/components/ask/lib/guard.ts')).toBe('b')
  })

  it('aborts on conflict (listing all) and writes nothing, unless --force', () => {
    const fs = fakeFs({ '/proj/components/ask/widget.tsx': 'old' })
    expect(() =>
      commitFiles(fs, TARGET, [
        { path: 'widget.tsx', content: 'new' },
        { path: 'new.ts', content: 'x' },
      ]),
    ).toThrow(IntegrityError)
    // nothing new written, original untouched
    expect(fs.files.get('/proj/components/ask/widget.tsx')).toBe('old')
    expect(fs.files.has('/proj/components/ask/new.ts')).toBe(false)

    // force overwrites
    const res = commitFiles(fs, TARGET, [{ path: 'widget.tsx', content: 'new' }], { force: true })
    expect(res.written).toHaveLength(1)
    expect(fs.files.get('/proj/components/ask/widget.tsx')).toBe('new')
  })

  it('writes nothing when any path is unsafe (validated before writing)', () => {
    const fs = fakeFs()
    expect(() =>
      commitFiles(fs, TARGET, [
        { path: 'ok.ts', content: 'a' },
        { path: '../escape.ts', content: 'b' },
      ]),
    ).toThrow(IntegrityError)
    expect(fs.files.size).toBe(0)
  })

  it('rolls back already-written files when a later write fails', () => {
    const fs = fakeFs({}, '/proj/components/ask/second.ts')
    expect(() =>
      commitFiles(fs, TARGET, [
        { path: 'first.ts', content: 'a' },
        { path: 'second.ts', content: 'b' },
      ]),
    ).toThrow(IntegrityError)
    // first.ts was written then rolled back → tree is clean
    expect(fs.files.size).toBe(0)
  })
})
