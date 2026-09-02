import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/core — package-wide executable coverage gate: 90% on all V8 metrics.
export default defineConfig(
  createTestConfig({
    linesThreshold: 90,
    statementsThreshold: 90,
    branchesThreshold: 90,
    functionsThreshold: 90,
    criticalFiles: {
      'src/security/vault.ts': 90,
      'src/security/rate-limit.ts': 90,
      'src/security/pii.ts': 90,
      'src/security/injection.ts': 90,
    },
  }),
)
