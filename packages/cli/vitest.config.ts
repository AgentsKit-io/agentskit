import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/cli — lines threshold: 90 (current ≈ 90%).
export default defineConfig(createTestConfig({ linesThreshold: 90 }))
