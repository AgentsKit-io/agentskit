import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('models.dev snapshot freshness metadata', () => {
  it('contains a normalized content hash', () => {
    const snapshot = JSON.parse(readFileSync('packages/adapters/src/catalog/snapshot.json', 'utf8'))
    expect(snapshot.source.contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(snapshot.source.url).toBe('https://models.dev/api.json')
  })
})
