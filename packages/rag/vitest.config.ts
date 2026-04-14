import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/rag — lines threshold: 95
export default defineConfig(createTestConfig({ linesThreshold: 95 }))
