import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/sandbox — lines threshold: 30
export default defineConfig(createTestConfig({ linesThreshold: 30 }))
