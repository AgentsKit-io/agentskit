import { createTestConfig } from '../../vitest.shared'
import { defineConfig, mergeConfig } from 'vitest/config'

// @agentskit/ink — lines threshold: 90
// Snapshots hold uncolored frames: pin color off so a FORCE_COLOR exported by
// the CI runner does not change the ANSI output.
export default mergeConfig(
  defineConfig(createTestConfig({ linesThreshold: 90 })),
  defineConfig({ test: { env: { FORCE_COLOR: '0' } } }),
)
