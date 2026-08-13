import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '../public')

describe('site icon fallbacks', () => {
  it.each([
    'favicon.ico',
    'favicon.svg',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'apple-touch-icon.png',
  ])('publishes %s', (filename) => {
    expect(existsSync(join(publicDir, filename))).toBe(true)
  })

  it('keeps the raster assets as real PNG files', () => {
    for (const filename of ['favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png']) {
      const signature = readFileSync(join(publicDir, filename)).subarray(0, 8)
      expect([...signature]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    }
  })
})
