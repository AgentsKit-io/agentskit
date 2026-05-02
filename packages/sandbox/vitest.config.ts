import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/sandbox — lines threshold: 60 (current ≈ 92%).
export default defineConfig(createTestConfig({ linesThreshold: 60 }))
