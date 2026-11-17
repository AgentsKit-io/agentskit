import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/memory — lines threshold: 90
export default defineConfig(createTestConfig({
  linesThreshold: 90,
  // Real on-disk vectra index tests exceed the 5 s default under turbo's
  // parallel load (#1936); assertions are unchanged.
  testTimeout: 30_000,
}))
