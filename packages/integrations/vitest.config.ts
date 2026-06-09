import { createTestConfig } from '../../vitest.shared'
import { defineConfig, mergeConfig } from 'vitest/config'

// @agentskit/integrations — lines threshold: 80.
// The scaffold under services/_template is excluded: it is a generator source,
// never imported by the catalog, and gains real coverage once instantiated.
export default defineConfig(
  mergeConfig(createTestConfig({ linesThreshold: 80 }), {
    test: {
      coverage: {
        exclude: ['src/services/_template/**'],
      },
    },
  }),
)
