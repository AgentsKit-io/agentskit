import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { testExclude } from '../../vitest.shared'

export default defineConfig({
  test: { exclude: testExclude(), slowTestThreshold: 2_000 },
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
})
