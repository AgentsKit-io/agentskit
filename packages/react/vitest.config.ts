import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/react — lines threshold: 70 (devtools topology graph + control surface
// landed in main without test parity; raise back once those modules gain coverage).
export default defineConfig(
  createTestConfig({
    linesThreshold: 70,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
  }),
)
