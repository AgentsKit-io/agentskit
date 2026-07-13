import { describe, it } from 'vitest'
import { runBundlerInteropChecks } from './bundler-interop.mjs'

describe('public replay package conditions', () => {
  it('keeps Node IO out of browser and React Native bundles while preserving Node ESM and CJS', async () => {
    await runBundlerInteropChecks()
  }, 30_000)
})
