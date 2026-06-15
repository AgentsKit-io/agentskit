import { fileURLToPath } from 'node:url'
import { createTestConfig } from '../../vitest.shared'
import { defineConfig, mergeConfig } from 'vitest/config'

// @agentskit/react-native — lines threshold: 70 (beta floor).
// RN primitives don't render under happy-dom, so `react-native` is aliased to
// a host-element mock (tests/react-native.mock.tsx) for component tests.
const reactNativeMock = fileURLToPath(new URL('./tests/react-native.mock.tsx', import.meta.url))

export default mergeConfig(
  defineConfig(createTestConfig({ linesThreshold: 70, environment: 'happy-dom' })),
  defineConfig({
    test: {
      alias: {
        'react-native': reactNativeMock,
      },
    },
  }),
)
