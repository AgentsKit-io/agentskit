import { describe, expect, it } from 'vitest'
import {
  basename,
  isAbsolutePath,
  isPathInside,
  isWindowsStylePath,
  joinPosix,
  normalizePosix,
  relativePosix,
  resolvePosix,
  samePath,
  toPosix,
} from '../src/paths'

describe('paths', () => {
  it('converts separators only', () => {
    expect(toPosix('C:\\repo\\src\\a.ts')).toBe('C:/repo/src/a.ts')
    expect(toPosix('./a/../b')).toBe('./a/../b')
  })

  it('normalises, joins and relativises with forward slashes', () => {
    expect(normalizePosix('C:\\a\\b\\..\\c')).toBe('C:/a/c')
    expect(joinPosix('a', '..', 'b', 'c.ts')).toBe('b/c.ts')
    expect(relativePosix('C:\\x\\y', 'C:\\x\\z\\f.ts')).toBe('../z/f.ts')
    expect(resolvePosix('/a', 'b')).toBe('/a/b')
    expect(basename('C:\\x\\f.ts')).toBe('f.ts')
  })

  it('detects absolute and Windows-style paths', () => {
    expect(isAbsolutePath('/x')).toBe(true)
    expect(isAbsolutePath('C:\\x')).toBe(true)
    expect(isAbsolutePath('\\\\srv\\share')).toBe(true)
    expect(isAbsolutePath('x/y')).toBe(false)
    expect(isWindowsStylePath('C:/x')).toBe(true)
    expect(isWindowsStylePath('\\\\srv\\share')).toBe(true)
    expect(isWindowsStylePath('/x')).toBe(false)
  })

  it('compares Windows paths regardless of separator, case and trailing slash', () => {
    expect(samePath('C:\\Repo\\src\\', 'c:/repo/src')).toBe(true)
    expect(samePath('C:\\repo\\a', 'C:\\repo\\b')).toBe(false)
  })

  it('compares POSIX paths case-sensitively unless asked', () => {
    if (process.platform === 'win32') return
    expect(samePath('/Repo/x', '/repo/x')).toBe(false)
    expect(samePath('/Repo/x', '/repo/x', { caseInsensitive: true })).toBe(true)
    expect(samePath('/', '/')).toBe(true)
  })

  it('checks containment without prefix false positives', () => {
    expect(isPathInside('C:\\repo', 'C:/Repo/packages/a.ts')).toBe(true)
    expect(isPathInside('C:\\repo', 'C:\\repo')).toBe(true)
    expect(isPathInside('/repo', '/repo-other/a.ts')).toBe(false)
    expect(isPathInside('/', '/etc/hosts')).toBe(true)
  })
})
