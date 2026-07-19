import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// CLI suites load Commander, Ink, and filesystem fixtures; Turbo contention can exceed Vitest defaults.
export default defineConfig(
  createTestConfig({ linesThreshold: 90, testTimeout: 30_000, hookTimeout: 30_000 }),
)
