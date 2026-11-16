import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/rag — lines threshold: 95
export default defineConfig(createTestConfig({
  linesThreshold: 95,
  // Real on-disk vectra index tests exceed the 5 s default under turbo's
  // parallel load (#1936); assertions are unchanged.
  testTimeout: 30_000,
}))
