import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/tools — lines threshold: 70
export default defineConfig(
  createTestConfig({
    linesThreshold: 70,
    // sqlite/process tests near the 5 s default fail under turbo's parallel
    // load (#1936); assertions are unchanged.
    testTimeout: 30_000,
    // Security-critical surfaces — agent-host boundary.
    criticalFiles: {
      'src/shell.ts': 90,
      'src/filesystem.ts': 90,
      'src/fetch-url.ts': 90,
      'src/sqlite-query.ts': 90,
      'src/mcp/client.ts': 90,
      'src/mcp/transports.ts': 90,
    },
  }),
)
