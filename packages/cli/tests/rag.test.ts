import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildRagFromConfig, indexSources } from '../src/extensibility/rag'

describe('rag', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'agentskit-rag-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('indexes globbed sources through an injected embedder', async () => {
    writeFileSync(join(dir, 'a.md'), 'alpha content')
    writeFileSync(join(dir, 'b.md'), 'beta content')

    const rag = buildRagFromConfig({
      config: {
        dir: join(dir, 'store'),
        sources: ['*.md'],
        chunkSize: 1000,
      },
      cwd: dir,
      embedder: async (text) => Array.from({ length: 3 }, (_, i) => (text.charCodeAt(i) ?? 0) / 255),
    })

    const result = await indexSources(rag, { sources: ['*.md'] }, dir)
    expect(result.documentCount).toBe(2)
    expect(result.sources.map(s => s.replace(dir, '').replace(/^\//, ''))).toEqual(
      expect.arrayContaining(['a.md', 'b.md']),
    )

    const hits = await rag.search('alpha', { topK: 2 })
    expect(hits.length).toBeGreaterThan(0)
  })

  it('returns zero sources when glob matches nothing', async () => {
    const rag = buildRagFromConfig({
      config: { dir: join(dir, 'store') },
      cwd: dir,
      embedder: async () => [0, 0, 0],
    })
    const result = await indexSources(rag, { sources: ['*.does-not-exist'] }, dir)
    expect(result.documentCount).toBe(0)
  })
})
