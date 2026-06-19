import { defineConfig } from 'vitest/config'
import { createTestConfig } from '../../vitest.shared'

export default defineConfig(createTestConfig({ linesThreshold: 80 }))
