import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
  entry: {
    index: 'src/index.ts',
    bin: 'src/bin.ts',
  },
  clean: true,
  external: ['react', 'ink', 'commander', '@agentskit/core', '@agentskit/ink'],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
