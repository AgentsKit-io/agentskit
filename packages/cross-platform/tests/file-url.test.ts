import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fileUrlToPath, isMainModule, moduleDir, pathToFileUrl } from '../src/file-url'

describe('file URLs', () => {
  it('round-trips a path', () => {
    const path = resolve('some dir', 'a b.ts')
    const url = pathToFileUrl(path)
    expect(url.startsWith('file://')).toBe(true)
    expect(url).toContain('a%20b.ts')
    expect(fileUrlToPath(url)).toBe(path)
    expect(fileUrlToPath(new URL(url))).toBe(path)
  })

  it('returns the module directory', () => {
    expect(moduleDir(import.meta.url)).toBe(dirname(fileURLToPath(import.meta.url)))
  })

  it('detects the entry module', () => {
    const file = resolve('scripts', 'x.mjs')
    const url = pathToFileURL(file).href
    expect(isMainModule(url, ['node', file])).toBe(true)
    expect(isMainModule(url, ['node', resolve('other.mjs')])).toBe(false)
    expect(isMainModule(url, ['node'])).toBe(false)
  })
})
