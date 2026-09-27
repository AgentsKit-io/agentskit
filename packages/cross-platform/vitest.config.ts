import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

export default defineConfig(
  createTestConfig({
    linesThreshold: 85,
    testTimeout: 20_000,
    criticalFiles: {
      'src/process/spawn.ts': 85,
      'src/fs.ts': 85,
    },
  }),
)
