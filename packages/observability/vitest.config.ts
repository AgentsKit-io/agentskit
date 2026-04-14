import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/observability — lines threshold: 55
export default defineConfig(createTestConfig({ linesThreshold: 55 }))
