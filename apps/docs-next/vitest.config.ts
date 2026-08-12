import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@': resolve(__dirname),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
