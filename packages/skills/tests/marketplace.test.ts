import { describe, expect, it } from 'vitest'
import type { SkillDefinition } from '@agentskit/core'
import { ErrorCodes, SkillError } from '@agentskit/core'
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
import { makeTool } from '../fixtures/tool-definitions'
import { SKILL_NAME_RE } from '../fixtures/all-builtin-skills'

function skill(name: string, overrides: Partial<SkillDefinition> = {}): SkillDefinition {
  return {
    name,
    description: `${name} description`,
    systemPrompt: `${name} system prompt with enough body for validation`,
    tools: [],
    delegates: [],
    ...overrides,
  }
}

async function expectSkillInvalid(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn()
    expect.unreachable('should have thrown')
  } catch (err) {
    expect(err).toBeInstanceOf(SkillError)
    expect((err as SkillError).code).toBe(ErrorCodes.AK_SKILL_INVALID)
  }
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
  it('parses major.minor.patch into the public [maj, min, patch] tuple', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3])
    expect(parseSemver('0.0.0')).toEqual([0, 0, 0])
    // Public shape stays a 3-tuple even when prerelease/build present.
    expect(parseSemver('1.2.3-beta.1')).toEqual([1, 2, 3])
    expect(parseSemver('1.2.3+build.5')).toEqual([1, 2, 3])
    expect(parseSemver('1.2.3-beta.1+exp.sha')).toEqual([1, 2, 3])
  })

  it('rejects invalid strings', () => {
    expect(() => parseSemver('not-a-version')).toThrow(/invalid semver/)
  })

  it('rejects leading zeroes, empty idents, and unsafe-integer core values', () => {
    for (const bad of [
      '01.2.3',
      '1.02.3',
      '1.2.03',
      '1.2.3-',
      '1.2.3+',
      '1.2.3-beta.',
      '1.2.3-.beta',
      '1.2.3-01',
      '1.2.3-beta.01',
      '1.2.3+',
      '1.2.3+build.',
      '1.2.3+.build',
      `${Number.MAX_SAFE_INTEGER + 1}.0.0`,
    ]) {
      expect(() => parseSemver(bad), bad).toThrow(/invalid semver/)
    }
  })

  it('compares numeric core correctly', () => {
    expect(compareSemver('1.2.3', '1.2.4')).toBeLessThan(0)
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0)
    expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0)
  })

  it('release outranks prerelease of the same core', () => {
    expect(compareSemver('1.0.0', '1.0.0-alpha')).toBeGreaterThan(0)
    expect(compareSemver('1.0.0-alpha', '1.0.0')).toBeLessThan(0)
  })

  it('compares prerelease identifiers per SemVer precedence', () => {
    // 1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0
    expect(compareSemver('1.0.0-alpha', '1.0.0-alpha.1')).toBeLessThan(0)
    expect(compareSemver('1.0.0-alpha.1', '1.0.0-alpha.beta')).toBeLessThan(0)
    expect(compareSemver('1.0.0-alpha.beta', '1.0.0-beta')).toBeLessThan(0)
    expect(compareSemver('1.0.0-beta', '1.0.0-beta.2')).toBeLessThan(0)
    expect(compareSemver('1.0.0-beta.2', '1.0.0-beta.11')).toBeLessThan(0)
    expect(compareSemver('1.0.0-beta.11', '1.0.0-rc.1')).toBeLessThan(0)
    expect(compareSemver('1.0.0-rc.1', '1.0.0')).toBeLessThan(0)
  })

  it('compares arbitrarily long numeric prerelease identifiers without Number overflow', () => {
    const short = '1.0.0-' + '9'.repeat(20)
    const long = '1.0.0-' + '1' + '0'.repeat(20)
    expect(compareSemver(short, long)).toBeLessThan(0)
    expect(compareSemver(long, short)).toBeGreaterThan(0)
    expect(compareSemver(long, long)).toBe(0)
  })

  it('build metadata does not affect precedence', () => {
    expect(compareSemver('1.0.0+20130313144700', '1.0.0')).toBe(0)
    expect(compareSemver('1.0.0+aaa', '1.0.0+bbb')).toBe(0)
    expect(compareSemver('1.0.0-alpha+001', '1.0.0-alpha+002')).toBe(0)
  })
})

describe('matchesRange', () => {
  it('wildcard + exact', () => {
    expect(matchesRange('1.2.3', '*')).toBe(true)
    expect(matchesRange('1.2.3', '1.2.3')).toBe(true)
    expect(matchesRange('1.2.3', '1.2.4')).toBe(false)
  })

  it('exact match ignores build metadata and compares prerelease', () => {
    expect(matchesRange('1.0.0+build.1', '1.0.0')).toBe(true)
    expect(matchesRange('1.0.0', '1.0.0+build.9')).toBe(true)
    expect(matchesRange('1.0.0-alpha+001', '1.0.0-alpha')).toBe(true)
    expect(matchesRange('1.0.0-alpha', '1.0.0')).toBe(false)
    expect(matchesRange('1.0.0-beta', '1.0.0-alpha')).toBe(false)
  })

  it('caret bounds by major for major>=1', () => {
    expect(matchesRange('1.5.0', '^1.2.3')).toBe(true)
    expect(matchesRange('2.0.0', '^1.2.3')).toBe(false)
    expect(matchesRange('1.2.0', '^1.2.3')).toBe(false)
  })

  it('caret on 0.x is minor-bound (npm-compatible): ^0.2.3 excludes 0.3.0', () => {
    expect(matchesRange('0.2.3', '^0.2.3')).toBe(true)
    expect(matchesRange('0.2.9', '^0.2.3')).toBe(true)
    expect(matchesRange('0.3.0', '^0.2.3')).toBe(false)
    expect(matchesRange('0.2.2', '^0.2.3')).toBe(false)
  })

  it('caret on 0.0.x is patch-bound: ^0.0.3 excludes 0.0.4', () => {
    expect(matchesRange('0.0.3', '^0.0.3')).toBe(true)
    expect(matchesRange('0.0.4', '^0.0.3')).toBe(false)
    expect(matchesRange('0.0.2', '^0.0.3')).toBe(false)
  })

  it('tilde bounds by minor', () => {
    expect(matchesRange('1.2.9', '~1.2.3')).toBe(true)
    expect(matchesRange('1.3.0', '~1.2.3')).toBe(false)
  })

  it('>= works', () => {
    expect(matchesRange('1.2.3', '>=1.0.0')).toBe(true)
    expect(matchesRange('0.9.0', '>=1.0.0')).toBe(false)
  })

  it('excludes prerelease candidates from ^ ~ >= unless range has same-tuple prerelease', () => {
    expect(matchesRange('1.2.4-beta.1', '^1.2.3')).toBe(false)
    expect(matchesRange('1.2.4-beta.1', '~1.2.3')).toBe(false)
    expect(matchesRange('1.2.4-beta.1', '>=1.2.3')).toBe(false)

    expect(matchesRange('1.2.3-beta.2', '^1.2.3-beta.1')).toBe(true)
    expect(matchesRange('1.2.3', '^1.2.3-beta.1')).toBe(true)
    expect(matchesRange('1.5.0', '^1.2.3-beta.1')).toBe(true)
    expect(matchesRange('1.3.0-beta', '^1.2.3-beta.1')).toBe(false)
    expect(matchesRange('1.2.3-alpha', '^1.2.3-beta.1')).toBe(false)

    expect(matchesRange('1.2.3-beta.2', '>=1.2.3-beta.1')).toBe(true)
    expect(matchesRange('1.2.3', '>=1.2.3-beta.1')).toBe(true)
    expect(matchesRange('1.3.0-beta', '>=1.2.3-beta.1')).toBe(false)
  })
})

describe('createSkillRegistry — publish validation', () => {
  it('rejects invalid S1 skill name with AK_SKILL_INVALID', async () => {
    const registry = createSkillRegistry()
    await expectSkillInvalid(() =>
      registry.publish({ version: '1.0.0', skill: skill('bad name!') }),
    )
  })

  it('rejects empty description / prompt', async () => {
    const registry = createSkillRegistry()
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { description: '' }),
      }),
    )
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { systemPrompt: '   ' }),
      }),
    )
  })

  it('rejects temperature outside 0..2', async () => {
    const registry = createSkillRegistry()
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { temperature: -1 }),
      }),
    )
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { temperature: 3 }),
      }),
    )
  })

  it('rejects invalid tool / delegate name references', async () => {
    const registry = createSkillRegistry()
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { tools: ['not a tool'] }),
      }),
    )
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { delegates: ['bad delegate'] }),
      }),
    )
  })

  it('rejects non-JSON-serializable metadata / examples', async () => {
    const registry = createSkillRegistry()
    const circular: Record<string, unknown> = {}
    circular.self = circular
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { metadata: circular }),
      }),
    )
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', {
          examples: [{ input: 'a', output: 'b', extra: () => 1 } as never],
        }),
      }),
    )
  })

  it('rejects Date/Map/class metadata containers (non-plain objects)', async () => {
    const registry = createSkillRegistry()
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { metadata: new Date() as never }),
      }),
    )
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { metadata: new Map() as never }),
      }),
    )
    class Box {
      v = 1
    }
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { metadata: new Box() as never }),
      }),
    )
  })

  it('rejects tools/delegates that are not string arrays and malformed examples', async () => {
    const registry = createSkillRegistry()
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { tools: 'web_search' as never }),
      }),
    )
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { tools: null as never }),
      }),
    )
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { delegates: 'critic' as never }),
      }),
    )
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { examples: 42 as never }),
      }),
    )
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { examples: null as never }),
      }),
    )
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('ok_name', { examples: ['not-an-object' as never] }),
      }),
    )
  })

  it('rejects null / non-object skills with AK_SKILL_INVALID', async () => {
    const registry = createSkillRegistry()
    await expectSkillInvalid(() =>
      registry.publish({ version: '1.0.0', skill: null as never }),
    )
    await expectSkillInvalid(() =>
      registry.publish({ version: '1.0.0', skill: 'researcher' as never }),
    )
    await expectSkillInvalid(() =>
      registry.publish({ version: '1.0.0', skill: 12 as never }),
    )
  })

  it('rejects a non-function onActivate with AK_SKILL_INVALID', async () => {
    const registry = createSkillRegistry()
    await expectSkillInvalid(() =>
      registry.publish({
        version: '1.0.0',
        skill: skill('bad_hook', { onActivate: 'not-a-function' as never }),
      }),
    )
  })

  it('clones repeated JSON references without treating them as cycles', async () => {
    const shared = { value: 1 }
    const registry = createSkillRegistry()
    const published = await registry.publish({
      version: '1.0.0',
      skill: skill('shared_metadata', { metadata: { first: shared, second: shared } }),
    })
    const metadata = published.skill.metadata as {
      first: { value: number }
      second: { value: number }
    }
    expect(metadata.first).toEqual({ value: 1 })
    expect(metadata.second).toEqual({ value: 1 })
    expect(metadata.first).not.toBe(metadata.second)
  })

  it('rejects invalid semver with AK_SKILL_INVALID', async () => {
    const registry = createSkillRegistry()
    await expectSkillInvalid(() =>
      registry.publish({ version: 'v1', skill: skill('ok_name') }),
    )
  })

  it('does NOT reject __proto__ solely by name (Map storage is prototype-safe; S1 permits it)', async () => {
    const registry = createSkillRegistry()
    const published = await registry.publish({
      version: '1.0.0',
      skill: skill('__proto__'),
    })
    expect(published.skill.name).toBe('__proto__')
    expect(published.skill.name).toMatch(SKILL_NAME_RE)
    const hits = await registry.list({ name: '__proto__' })
    expect(hits).toHaveLength(1)
    const installed = await registry.install('__proto__')
    expect(installed?.skill.name).toBe('__proto__')
  })

  it('preserves metadata __proto__ as own data across publish/list/install without prototype pollution', async () => {
    const registry = createSkillRegistry()
    const metadata = JSON.parse('{"__proto__":{"isAdmin":true},"role":"user"}') as Record<
      string,
      unknown
    >
    expect(Object.prototype.hasOwnProperty.call(metadata, '__proto__')).toBe(true)
    expect((metadata as { isAdmin?: unknown }).isAdmin).toBeUndefined()

    const published = await registry.publish({
      version: '1.0.0',
      skill: skill('proto_meta', { metadata }),
    })

    // Input must not gain inherited flags from cloning.
    expect((metadata as { isAdmin?: unknown }).isAdmin).toBeUndefined()
    expect(Object.getPrototypeOf(metadata)).toBe(Object.prototype)

    for (const copy of [
      published.skill.metadata!,
      (await registry.list({ name: 'proto_meta' }))[0]!.skill.metadata!,
      (await registry.install('proto_meta'))!.skill.metadata!,
    ]) {
      expect(Object.prototype.hasOwnProperty.call(copy, '__proto__')).toBe(true)
      expect(Object.prototype.hasOwnProperty.call(copy, 'role')).toBe(true)
      expect(copy.role).toBe('user')
      expect((copy as { isAdmin?: unknown }).isAdmin).toBeUndefined()
      expect(Object.getPrototypeOf(copy)).toBe(Object.prototype)
      const protoData = Object.getOwnPropertyDescriptor(copy, '__proto__')?.value as {
        isAdmin?: unknown
      }
      expect(protoData).toEqual({ isAdmin: true })

      // Mutating the stored copy must not affect later reads or the input.
      ;(copy as { role: string }).role = 'MUTATED'
      ;(protoData as { isAdmin: boolean }).isAdmin = false
    }

    const again = (await registry.install('proto_meta'))!.skill.metadata!
    expect(again.role).toBe('user')
    expect(Object.getOwnPropertyDescriptor(again, '__proto__')?.value).toEqual({
      isAdmin: true,
    })
    expect(metadata.role).toBe('user')
    expect(Object.getOwnPropertyDescriptor(metadata, '__proto__')?.value).toEqual({
      isAdmin: true,
    })
  })
})

describe('createSkillRegistry — isolation & concurrency', () => {
  it('publishes + lists with defensive copies of skill/tags/examples/arrays/metadata', async () => {
    const onActivate = async () => ({ tools: [makeTool('dyn')] })
    const inputSkill = skill('foo', {
      tools: ['web_search'],
      delegates: ['critic'],
      examples: [{ input: 'q', output: 'a' }],
      metadata: { nested: { v: 1 } },
      onActivate,
    })
    const tags = ['ai', 'demo']
    const registry = createSkillRegistry()
    const published = await registry.publish({
      version: '1.0.0',
      skill: inputSkill,
      tags,
      publisher: 'acme',
    })

    // Isolation: mutate input after publish.
    inputSkill.tools!.push('MUTATED')
    inputSkill.examples![0]!.input = 'MUTATED'
    ;(inputSkill.metadata!.nested as { v: number }).v = 99
    tags.push('MUTATED_TAG')

    expect(published.skill).not.toBe(inputSkill)
    expect(published.skill.tools).toEqual(['web_search'])
    expect(published.skill.examples).toEqual([{ input: 'q', output: 'a' }])
    expect(published.skill.metadata).toEqual({ nested: { v: 1 } })
    expect(published.tags).toEqual(['ai', 'demo'])
    // onActivate identity is preserved when present.
    expect(published.skill.onActivate).toBe(onActivate)

    const listed = await registry.list()
    listed[0]!.skill.tools!.push('LIST_MUTATION')
    listed[0]!.tags!.push('LIST_TAG')
    ;(listed[0]!.skill.metadata!.nested as { v: number }).v = 42

    const listedAgain = await registry.list()
    expect(listedAgain[0]!.skill.tools).toEqual(['web_search'])
    expect(listedAgain[0]!.tags).toEqual(['ai', 'demo'])
    expect(listedAgain[0]!.skill.metadata).toEqual({ nested: { v: 1 } })
    expect(listedAgain[0]!.skill.onActivate).toBe(onActivate)

    const installed = await registry.install('foo')
    expect(installed).not.toBeNull()
    installed!.skill.tools!.push('INSTALL_MUTATION')
    const installedAgain = await registry.install('foo')
    expect(installedAgain!.skill.tools).toEqual(['web_search'])
    expect(installedAgain!.skill.onActivate).toBe(onActivate)
  })

  it('isolates initial packages passed to createSkillRegistry', async () => {
    const initialSkill = skill('seed', {
      tools: ['t1'],
      examples: [{ input: 'i', output: 'o' }],
      metadata: { k: 1 },
    })
    const initialTags = ['seed']
    const registry = createSkillRegistry([
      { version: '1.0.0', skill: initialSkill, tags: initialTags },
    ])
    initialSkill.tools!.push('MUTATED')
    initialTags.push('MUTATED')
    const hits = await registry.list()
    expect(hits[0]!.skill.tools).toEqual(['t1'])
    expect(hits[0]!.tags).toEqual(['seed'])
  })

  it('concurrent same-name/version publish yields one success and one AK_SKILL_DUPLICATE', async () => {
    const registry = createSkillRegistry()
    const pkg = { version: '1.0.0', skill: skill('race') }
    const results = await Promise.allSettled([
      registry.publish(pkg),
      registry.publish({ version: '1.0.0', skill: skill('race') }),
    ])
    const fulfilled = results.filter(r => r.status === 'fulfilled')
    const rejected = results.filter(r => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    const reason = (rejected[0] as PromiseRejectedResult).reason
    expect(reason).toBeInstanceOf(SkillError)
    expect((reason as SkillError).code).toBe(ErrorCodes.AK_SKILL_DUPLICATE)
  })

  it('rejects sequential duplicate (name, version) with AK_SKILL_DUPLICATE', async () => {
    const registry = createSkillRegistry()
    await registry.publish({ version: '1.0.0', skill: skill('foo') })
    await expect(
      registry.publish({ version: '1.0.0', skill: skill('foo') }),
    ).rejects.toMatchObject({ code: ErrorCodes.AK_SKILL_DUPLICATE })
  })

  it('list ordering is deterministic (stable across calls)', async () => {
    const registry = createSkillRegistry()
    await registry.publish({ version: '1.0.0', skill: skill('zeta') })
    await registry.publish({ version: '2.0.0', skill: skill('alpha') })
    await registry.publish({ version: '1.1.0', skill: skill('alpha') })
    await registry.publish({ version: '0.9.0', skill: skill('mu') })
    const a = (await registry.list()).map(p => `${p.skill.name}@${p.version}`)
    const b = (await registry.list()).map(p => `${p.skill.name}@${p.version}`)
    expect(a).toEqual(b)
    expect(a.length).toBe(4)
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

  it('publishes + lists basic path still works', async () => {
    const registry = createSkillRegistry()
    await registry.publish({ version: '1.0.0', skill: skill('foo') })
    const hits = await registry.list()
    expect(hits).toHaveLength(1)
    expect(hits[0]!.skill.name).toBe('foo')
    expect(hits[0]!.publishedAt).toBeDefined()
  })
})
