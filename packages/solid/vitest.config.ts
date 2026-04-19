import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

export default defineConfig(createTestConfig({ linesThreshold: 0 }))
