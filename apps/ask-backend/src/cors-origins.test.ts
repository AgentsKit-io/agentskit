import { describe, expect, it } from 'vitest'

import { resolveCorsOrigins } from './cors-origins.js'

describe('resolveCorsOrigins', () => {
  it('includes the official Doc Bridge origin in the defaults', () => {
    expect(resolveCorsOrigins()).toContain('https://agentskit-io.github.io')
  })

  it('preserves the official Doc Bridge origin when the environment overrides CORS', () => {
    expect(resolveCorsOrigins('https://custom.example')).toEqual([
      'https://custom.example',
      'https://agentskit-io.github.io',
    ])
  })

  it('normalizes and deduplicates configured origins', () => {
    expect(
      resolveCorsOrigins(' https://agentskit-io.github.io/, https://custom.example/,https://custom.example '),
    ).toEqual(['https://agentskit-io.github.io', 'https://custom.example'])
  })
})
