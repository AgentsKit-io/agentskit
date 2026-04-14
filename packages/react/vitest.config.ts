import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/react — lines threshold: 80
export default defineConfig(
  createTestConfig({
    linesThreshold: 80,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
  }),
)
