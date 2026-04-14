import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/memory — lines threshold: 80
export default defineConfig(createTestConfig({ linesThreshold: 80 }))
