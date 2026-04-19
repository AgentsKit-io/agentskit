import { describe, expect, it } from 'vitest'
import type { SkillDefinition } from '@agentskit/core'
import {
  codeReviewer,
  compareSemver,
  createSkillRegistry,
  dataAnalyst,
  matchesRange,
  parseSemver,
  sqlGen,
  translator,
} from '../src'

function skill(name: string): SkillDefinition {
  return { name, description: name, systemPrompt: 'x', tools: [], delegates: [] }
}

describe('ready-made skills are well-formed', () => {
  it('exposes name, description, and systemPrompt', () => {
    for (const s of [codeReviewer, sqlGen, dataAnalyst, translator]) {
      expect(s.name).toBeTruthy()
      expect(s.description?.length).toBeGreaterThan(5)
      expect(s.systemPrompt?.length).toBeGreaterThan(20)
    }
  })
})

describe('parseSemver / compareSemver', () => {
  it('parses major.minor.patch', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3])
    expect(parseSemver('0.0.0')).toEqual([0, 0, 0])
  })

  it('accepts prerelease', () => {
    expect(parseSemver('1.2.3-beta.1')).toEqual([1, 2, 3])
  })

  it('rejects invalid strings', () => {
    expect(() => parseSemver('not-a-version')).toThrow(/invalid semver/)
  })

  it('compares correctly', () => {
    expect(compareSemver('1.2.3', '1.2.4')).toBeLessThan(0)
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0)
    expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0)
  })
})

describe('matchesRange', () => {
  it('wildcard + exact', () => {
    expect(matchesRange('1.2.3', '*')).toBe(true)
    expect(matchesRange('1.2.3', '1.2.3')).toBe(true)
    expect(matchesRange('1.2.3', '1.2.4')).toBe(false)
  })

  it('caret bounds by major', () => {
    expect(matchesRange('1.5.0', '^1.2.3')).toBe(true)
    expect(matchesRange('2.0.0', '^1.2.3')).toBe(false)
    expect(matchesRange('1.2.0', '^1.2.3')).toBe(false)
  })

  it('tilde bounds by minor', () => {
    expect(matchesRange('1.2.9', '~1.2.3')).toBe(true)
    expect(matchesRange('1.3.0', '~1.2.3')).toBe(false)
  })

  it('>= works', () => {
    expect(matchesRange('1.2.3', '>=1.0.0')).toBe(true)
    expect(matchesRange('0.9.0', '>=1.0.0')).toBe(false)
  })
})

describe('createSkillRegistry', () => {
  it('publishes + lists', async () => {
    const registry = createSkillRegistry()
    await registry.publish({ version: '1.0.0', skill: skill('foo') })
    const hits = await registry.list()
    expect(hits).toHaveLength(1)
    expect(hits[0]!.skill.name).toBe('foo')
    expect(hits[0]!.publishedAt).toBeDefined()
  })

  it('rejects duplicate (name, version)', async () => {
    const registry = createSkillRegistry()
    await registry.publish({ version: '1.0.0', skill: skill('foo') })
    await expect(
      registry.publish({ version: '1.0.0', skill: skill('foo') }),
    ).rejects.toThrow(/already published/)
  })

  it('install returns latest matching version', async () => {
    const registry = createSkillRegistry()
    await registry.publish({ version: '1.0.0', skill: skill('foo') })
    await registry.publish({ version: '1.2.0', skill: skill('foo') })
    await registry.publish({ version: '2.0.0', skill: skill('foo') })
    const resolved = await registry.install('foo', '^1.0.0')
    expect(resolved?.version).toBe('1.2.0')
  })

  it('install returns latest when no range', async () => {
    const registry = createSkillRegistry()
    await registry.publish({ version: '1.0.0', skill: skill('foo') })
    await registry.publish({ version: '2.0.0', skill: skill('foo') })
    const resolved = await registry.install('foo')
    expect(resolved?.version).toBe('2.0.0')
  })

  it('list filters by publisher + tag', async () => {
    const registry = createSkillRegistry()
    await registry.publish({ version: '1.0.0', skill: skill('foo'), publisher: 'acme', tags: ['ai'] })
    await registry.publish({ version: '1.0.0', skill: skill('bar'), publisher: 'other', tags: ['ai'] })
    expect((await registry.list({ publisher: 'acme' })).length).toBe(1)
    expect((await registry.list({ tag: 'ai' })).length).toBe(2)
  })

  it('unpublish removes a version', async () => {
    const registry = createSkillRegistry()
    await registry.publish({ version: '1.0.0', skill: skill('foo') })
    await registry.publish({ version: '2.0.0', skill: skill('foo') })
    await registry.unpublish?.('foo', '1.0.0')
    const remaining = await registry.list()
    expect(remaining.map(p => p.version)).toEqual(['2.0.0'])
  })
})
