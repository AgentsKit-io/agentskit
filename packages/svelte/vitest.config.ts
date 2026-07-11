import { createTestConfig } from '../../vitest.shared'
import { defineConfig, mergeConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'

// @agentskit/svelte — lines threshold: 70 (beta floor; coverage counts .ts only; .svelte
// components are compiled by vite-plugin-svelte and exercised via tests).
// svelteTesting() wires browser-condition resolution + auto cleanup.
export default mergeConfig(
  defineConfig(createTestConfig({ linesThreshold: 70, environment: 'happy-dom' })),
  defineConfig({ test: { include: ['tests/{components,store}.test.ts'] }, plugins: [svelte(), svelteTesting()] }),
)
