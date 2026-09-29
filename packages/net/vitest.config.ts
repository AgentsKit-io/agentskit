import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

export default defineConfig(
  createTestConfig({
    linesThreshold: 90,
    criticalFiles: {
      'src/fetch.ts': 90,
      'src/address.ts': 90,
    },
  }),
)
