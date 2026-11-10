import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
  entry: {
    index: 'src/index.ts',
    createAdapter: 'src/createAdapter.ts',
    'cli/index': 'src/cli/index.ts',
    'catalog/index': 'src/catalog/index.ts',
    'langchain-bridge': 'src/langchain-bridge.ts',
  },
  clean: true,
  external: ['@agentskit/core', /^@langchain\/core/],
})
