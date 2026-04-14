import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/cli — lines threshold: 30
export default defineConfig(createTestConfig({ linesThreshold: 30 }))
