import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/observability — lines threshold: 60 (current ≈ 84%; raise per audit).
export default defineConfig(createTestConfig({ linesThreshold: 60 }))
