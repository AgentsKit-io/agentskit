import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/adapters — lines threshold: 60
export default defineConfig(createTestConfig({ linesThreshold: 60 }))
