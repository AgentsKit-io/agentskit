import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/templates — lines threshold: 95
export default defineConfig(createTestConfig({ linesThreshold: 95 }))
