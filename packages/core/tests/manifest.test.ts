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

  it('accepts the complete tool and skill shape', () => {
    const m = validateManifest({
      ...valid,
      tools: [{
        name: 'tool_1',
        description: 'A tool',
        inputSchema: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string' },
            tags: { type: 'array', items: [{ type: 'string' }] },
          },
          items: { type: 'string' },
          additionalProperties: false,
        },
        tags: ['search'],
        category: 'network',
        requiresConfirmation: true,
      }],
      skills: [{
        name: 'researcher',
        description: 'Researches',
        systemPrompt: 'Research carefully',
        tools: ['search'],
        delegates: ['writer'],
        examples: [{ input: 'find', output: 'found' }],
      }],
    })

    expect(m.tools?.[0]?.inputSchema?.type).toBe('object')
    expect(m.tools?.[0]?.requiresConfirmation).toBe(true)
    expect(m.skills?.[0]?.examples).toHaveLength(1)
  })

  it.each([
    { tools: 'not-an-array' },
    { skills: 'not-an-array' },
    { publisher: 1 },
    { homepage: 1 },
    { description: 1 },
    { metadata: [] },
    { tools: [{ name: 'bad.name' }] },
    { tools: [{ name: 'tool', description: 1 }] },
    { tools: [{ name: 'tool', inputSchema: 'bad' }] },
    { tools: [{ name: 'tool', tags: ['ok', 1] }] },
    { tools: [{ name: 'tool', category: 1 }] },
    { tools: [{ name: 'tool', requiresConfirmation: 'yes' }] },
    { skills: [{ name: 'skill', systemPrompt: 'ok', description: 1 }] },
    { skills: [{ name: 'skill', systemPrompt: 'ok', tools: ['ok', 1] }] },
    { skills: [{ name: 'skill', systemPrompt: 'ok', delegates: ['ok', 1] }] },
    { skills: [{ name: 'skill', systemPrompt: 'ok', examples: [{ input: 'ok' }] }] },
  ])('rejects malformed optional fields', (extra) => {
    expect(() => validateManifest({ ...valid, ...extra })).toThrow(/Invalid manifest/)
  })

  it.each([
    { type: 'bad' },
    { required: 'bad' },
    { required: ['ok', 1] },
    { properties: [] },
    { properties: { nested: 'bad' } },
    { items: 'bad' },
    { items: [{ type: 'bad' }] },
    { additionalProperties: 1 },
    { additionalProperties: { type: 'bad' } },
  ])('rejects malformed nested JSON schema %j', (schema) => {
    expect(() => validateManifest({
      ...valid,
      tools: [{ name: 'tool', inputSchema: schema }],
    })).toThrow(/Invalid manifest/)
  })

  it('rejects cyclic nested schemas', () => {
    const schema: Record<string, unknown> = { type: 'object' }
    schema.properties = { self: schema }
    expect(() => validateManifest({
      ...valid,
      tools: [{ name: 'tool', inputSchema: schema }],
    })).toThrow(/must not be cyclic/)
  })

  it('rejects schemas that exceed depth and node budgets', () => {
    let deep: Record<string, unknown> = { type: 'string' }
    for (let i = 0; i < 65; i++) deep = { type: 'array', items: deep }
    expect(() => validateManifest({
      ...valid,
      tools: [{ name: 'tool', inputSchema: deep }],
    })).toThrow(/depth limit/)

    const properties: Record<string, unknown> = {}
    for (let i = 0; i < 10_001; i++) properties[`field${i}`] = { type: 'string' }
    expect(() => validateManifest({
      ...valid,
      tools: [{ name: 'tool', inputSchema: { type: 'object', properties } }],
    })).toThrow(/node schema limit/)
  })
})
