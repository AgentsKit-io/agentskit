import { createTestConfig } from '../../vitest.shared'
import { defineConfig, mergeConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'

// @agentskit/svelte — lines threshold: 70 (beta floor; coverage counts .ts only; .svelte
// components are compiled by vite-plugin-svelte and exercised via tests).
// svelteTesting() wires browser-condition resolution + auto cleanup.
export default mergeConfig(
  defineConfig(createTestConfig({
    linesThreshold: 70,
    environment: 'happy-dom',
    // The package-manifest test imports the built dist entry; under turbo's
    // parallel load it exceeds the 5 s default (#1936). Assertions unchanged.
    testTimeout: 30_000,
  })),
  defineConfig({
    test: { include: ['tests/{components,store,package-manifest}.test.ts'] },
    plugins: [svelte(), svelteTesting()],
  }),
)
