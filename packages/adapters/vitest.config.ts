import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/adapters — lines threshold: 90
export default defineConfig(createTestConfig({ linesThreshold: 90 }))
