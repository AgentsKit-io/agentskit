import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
  entry: {
    index: 'src/index.ts',
    personalization: 'src/personalization.ts',
    'web-storage': 'src/web-storage.ts',
  },
  clean: false,
  external: ['better-sqlite3', 'redis', 'vectra', '@lancedb/lancedb'],
})
