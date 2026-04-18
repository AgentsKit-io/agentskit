import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  comparePrompt,
  cosine,
  jaccard,
  matchPromptSnapshot,
  normalize,
  tokenize,
} from '../src/snapshot'

describe('snapshot utilities', () => {
  it('normalizes whitespace, case, and punctuation', () => {
    expect(normalize('Hello,  WORLD!')).toBe('hello world')
  })

  it('tokenizes text into non-empty tokens', () => {
    expect(tokenize('Hi, there.')).toEqual(['hi', 'there'])
  })

  it('jaccard similarity', () => {
    expect(jaccard('hello world', 'hello world')).toBe(1)
    expect(jaccard('a b c', 'a b d')).toBeCloseTo(0.5, 5)
    expect(jaccard('', '')).toBe(1)
  })

  it('cosine similarity', () => {
    expect(cosine([1, 0], [1, 0])).toBe(1)
    expect(cosine([1, 0], [0, 1])).toBe(0)
    expect(cosine([], [])).toBe(0)
  })
})

describe('comparePrompt', () => {
  it('exact mode', async () => {
    const r = await comparePrompt('same', 'same')
    expect(r.matched).toBe(true)
    const r2 = await comparePrompt('a', 'b')
    expect(r2.matched).toBe(false)
  })

  it('normalized mode ignores case/punct', async () => {
    const r = await comparePrompt('Hello, world!', 'hello world', { kind: 'normalized' })
    expect(r.matched).toBe(true)
  })

  it('similarity mode with jaccard', async () => {
    const r = await comparePrompt('a b c d', 'a b c e', { kind: 'similarity', threshold: 0.5 })
    expect(r.matched).toBe(true)
    expect(r.similarity).toBeGreaterThan(0.5)
  })

  it('similarity mode uses embed fn when provided', async () => {
    const r = await comparePrompt('x', 'y', {
      kind: 'similarity',
      threshold: 0.9,
      embed: () => [1, 0, 0],
    })
    expect(r.matched).toBe(true)
    expect(r.similarity).toBe(1)
  })
})

describe('matchPromptSnapshot', () => {
  it('creates a new snapshot when missing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-snap-'))
    try {
      const path = join(dir, 'nested', 'a.snap.txt')
      const r = await matchPromptSnapshot('hello', path)
      expect(r.matched).toBe(true)
      expect(r.reason).toBe('snapshot created')
      expect(await readFile(path, 'utf8')).toBe('hello')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('matches against existing snapshot', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-snap-'))
    try {
      const path = join(dir, 'a.snap.txt')
      await matchPromptSnapshot('hello', path)
      const r = await matchPromptSnapshot('hello', path)
      expect(r.matched).toBe(true)
      const bad = await matchPromptSnapshot('goodbye', path)
      expect(bad.matched).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('update flag overwrites', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-snap-'))
    try {
      const path = join(dir, 'a.snap.txt')
      await matchPromptSnapshot('hello', path)
      const r = await matchPromptSnapshot('world', path, { update: true })
      expect(r.matched).toBe(true)
      expect(await readFile(path, 'utf8')).toBe('world')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
