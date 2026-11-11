import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import { testExclude } from '../../vitest.shared'

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@': resolve(__dirname),
    },
  },
  test: {
    environment: 'node',
    exclude: testExclude(),
    slowTestThreshold: 2_000,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'tests/**/*.test.mjs'],
  },
})
