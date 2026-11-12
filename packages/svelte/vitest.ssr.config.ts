import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { testExclude } from '../../vitest.shared'

export default defineConfig({ test: { environment: 'node', exclude: testExclude(), slowTestThreshold: 2_000, include: ['tests/ssr.test.ts'] }, plugins: [svelte()] })
