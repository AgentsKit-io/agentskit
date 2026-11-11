import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import { testExclude } from '../vitest.shared'

export default defineConfig({
  test: {
    environment: 'node',
    exclude: testExclude(),
    slowTestThreshold: 2_000,
    globals: true,
    include: [resolve(__dirname, '*.test.ts'), resolve(__dirname, 'interop/*.test.ts')],
  },
})
