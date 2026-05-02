import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/cli — lines threshold: 60 (current ≈ 63%).
export default defineConfig(createTestConfig({ linesThreshold: 60 }))
