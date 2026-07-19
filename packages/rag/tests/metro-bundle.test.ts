import { describe, it } from 'vitest'
import { runMetroBundleChecks } from './metro-bundle.mjs'

describe('public Metro bundle', () => {
  it('bundles the universal entry for web and React Native while preserving the lazy Node peer', async () => {
    await runMetroBundleChecks()
  }, 120_000)
})
