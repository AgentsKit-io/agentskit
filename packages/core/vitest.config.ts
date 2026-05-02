import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/core — lines threshold: 80 (CLAUDE.md sacred target, current ≈ 92%).
export default defineConfig(createTestConfig({ linesThreshold: 80 }))
