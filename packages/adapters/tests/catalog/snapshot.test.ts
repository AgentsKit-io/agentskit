import { describe, expect, it } from 'vitest'
import { createAjvValidator } from '@agentskit/tools/validation'
import { catalog, catalogSnapshotSchema, catalogSource } from '../../src/catalog'

const validate = createAjvValidator({ rejectAdditionalProperties: true })

describe('catalog snapshot', () => {
  it('validates against the published JSON Schema', () => {
    const result = validate(catalogSnapshotSchema, catalog as unknown as Record<string, unknown>)
    expect(result.valid, result.valid ? '' : result.message).toBe(true)
  })

  it('carries provenance + freshness metadata', () => {
    const src = catalogSource()
    expect(src.name).toBe('models.dev')
    expect(src.version).toMatch(/\d/)
    expect(() => new Date(src.generatedAt).toISOString()).not.toThrow()
  })

  it('has providers and models', () => {
    expect(catalog.providers.length).toBeGreaterThan(50)
    const total = catalog.providers.reduce((n, p) => n + p.models.length, 0)
    expect(total).toBeGreaterThan(500)
  })

  it('rejects an invalid snapshot (missing required field)', () => {
    const bad = { ...catalog, providers: [{ id: 'x' }] }
    const result = validate(catalogSnapshotSchema, bad as unknown as Record<string, unknown>)
    expect(result.valid).toBe(false)
  })
})
