import solidPlugin from 'vite-plugin-solid'
import { createTestConfig } from '../../vitest.shared'
import { defineConfig, mergeConfig } from 'vitest/config'

// @agentskit/solid — lines threshold: 70 (beta floor); JSX via vite-plugin-solid.
export default mergeConfig(
  defineConfig(createTestConfig({ linesThreshold: 70, environment: 'happy-dom' })),
  defineConfig({ plugins: [solidPlugin()] }),
)
