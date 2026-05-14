import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/core — lines threshold: 80 (CLAUDE.md sacred target, current ≈ 92%).
export default defineConfig(
  createTestConfig({
    linesThreshold: 80,
    criticalFiles: {
      'src/security/vault.ts': 90,
      'src/security/rate-limit.ts': 90,
      'src/security/pii.ts': 90,
      'src/security/injection.ts': 90,
    },
  }),
)
