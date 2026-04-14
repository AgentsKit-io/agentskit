import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/core — lines threshold: 75
export default defineConfig(createTestConfig({ linesThreshold: 75 }))
