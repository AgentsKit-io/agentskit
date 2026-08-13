import { describe, it } from 'vitest'
import { runBundlerInteropChecks } from './bundler-interop.mjs'

describe('public replay package conditions', () => {
  it('keeps Node IO out of browser and React Native bundles while preserving Node ESM and CJS', async () => {
    await runBundlerInteropChecks()
  // Metro startup can exceed 30s on shared CI runners; keep the assertion
  // strict while allowing the integration test enough time to complete.
  }, 90_000)
})
