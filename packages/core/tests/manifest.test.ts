import { describe, expect, it } from 'vitest'
import { MANIFEST_VERSION, validateManifest } from '../src/manifest'

const valid = {
  manifestVersion: MANIFEST_VERSION,
  name: 'my-pack',
  version: '1.2.3',
  tools: [{ name: 'search' }],
  skills: [{ name: 'researcher', systemPrompt: 'be thorough' }],
}

describe('validateManifest', () => {
  it('accepts a minimal manifest', () => {
    const m = validateManifest(valid)
    expect(m.name).toBe('my-pack')
    expect(m.tools?.[0]!.name).toBe('search')
    expect(m.skills?.[0]!.name).toBe('researcher')
  })

  it('rejects missing version/name/manifestVersion', () => {
    expect(() => validateManifest({})).toThrow(/manifestVersion/)
    expect(() => validateManifest({ manifestVersion: MANIFEST_VERSION })).toThrow(/name required/)
    expect(() => validateManifest({ manifestVersion: MANIFEST_VERSION, name: 'x' })).toThrow(/version required/)
  })

  it('rejects malformed tool / skill entries', () => {
    expect(() =>
      validateManifest({ ...valid, tools: [{ description: 'no name' }] }),
    ).toThrow(/tools\[0\]\.name/)
    expect(() =>
      validateManifest({ ...valid, skills: [{ name: 'x' }] }),
    ).toThrow(/systemPrompt required/)
  })

  it('passes through publisher / homepage / metadata', () => {
    const m = validateManifest({
      ...valid,
      publisher: 'acme',
      homepage: 'https://x',
      metadata: { license: 'MIT' },
    })
    expect(m.publisher).toBe('acme')
    expect(m.metadata?.license).toBe('MIT')
  })
})
