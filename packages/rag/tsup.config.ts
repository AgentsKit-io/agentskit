import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig([
  {
    ...sharedTsupOptions,
    entry: {
      index: 'src/index-node.ts',
      chunker: 'src/chunker.ts',
      markdown: 'src/markdown.ts',
    },
    clean: true,
    external: ['@agentskit/core'],
  },
  {
    ...sharedTsupOptions,
    entry: {
      'index.browser': 'src/index.ts',
    },
    dts: false,
    clean: false,
    external: ['@agentskit/core'],
  },
])
