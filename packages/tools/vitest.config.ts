import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/tools — lines threshold: 70
export default defineConfig(createTestConfig({ linesThreshold: 70 }))
