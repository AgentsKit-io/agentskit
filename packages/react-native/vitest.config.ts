import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/react-native — lines threshold: 60.
export default defineConfig(
  createTestConfig({ linesThreshold: 60, environment: 'happy-dom' }),
)
