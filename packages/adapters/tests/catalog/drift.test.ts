import { describe, expect, it } from 'vitest'
import { detectCatalogDrift, FIRST_CLASS_PROVIDERS } from '../../src/catalog'
import type { CatalogProvider } from '../../src/catalog'

function provider(id: string, openaiCompatible: boolean): CatalogProvider {
  return { id, name: id, env: [], openaiCompatible, models: [] }
}

describe('detectCatalogDrift', () => {
  it('is ok when every provider is first-class or openai-compatible', () => {
    const report = detectCatalogDrift([
      ...FIRST_CLASS_PROVIDERS.map((id) => provider(id, false)),
      provider('deepseek', true),
    ])
    expect(report.ok).toBe(true)
    expect(report.undispatchable).toEqual([])
    expect(report.missingFromCatalog).toEqual([])
  })

  it('flags a provider that is neither first-class nor openai-compatible', () => {
    const report = detectCatalogDrift([
      ...FIRST_CLASS_PROVIDERS.map((id) => provider(id, false)),
      provider('mystery', false),
    ])
    expect(report.ok).toBe(false)
    expect(report.undispatchable).toEqual(['mystery'])
  })

  it('flags a first-class provider missing from the catalog', () => {
    const report = detectCatalogDrift([provider('openai', false)])
    expect(report.ok).toBe(false)
    expect(report.missingFromCatalog).toContain('anthropic')
  })

  it('runs against the real committed snapshot without throwing', () => {
    const report = detectCatalogDrift()
    expect(report.missingFromCatalog).toEqual([])
    expect(Array.isArray(report.undispatchable)).toBe(true)
  })
})
