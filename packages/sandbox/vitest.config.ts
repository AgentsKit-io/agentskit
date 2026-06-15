import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/sandbox — lines threshold: 60 (current ≈ 92%).
export default defineConfig(
  createTestConfig({
    linesThreshold: 85,
    criticalFiles: {
      'src/policy.ts': 90,
      // sandbox.ts lazy-imports e2b-backend; the dynamic-import branch
      // is exercised only in integration, not unit tests. Hold the
      // package's existing achieved bar (80) instead of demanding 90.
      'src/sandbox.ts': 80,
    },
  }),
)
